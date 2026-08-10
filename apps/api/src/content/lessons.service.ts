import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  accessibleAgeCategories,
  ageCategoryForDateOfBirth,
  type LessonBlockDto,
  type LessonDto,
  type Locale,
} from "@kidslearn/types";
import { Prisma, type Locale as PrismaLocale } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { CacheKeys, CacheService } from "../common/redis/redis.service";
import { AppException } from "../common/errors/app-exception";
import { pickTranslation, toPrismaLocale } from "../common/utils/locale";
import { StorageService } from "../media/storage.service";
import { ChildAccessService } from "../children/child-access.service";
import type { RequestUser } from "../common/decorators";
import type { ChangeStatusDto, LessonQueryDto, UpsertLessonDto } from "./dto/content.dto";
import { slugify } from "../common/utils/slug";

const lessonInclude = {
  translations: true,
  subject: { include: { translations: true } },
  coverMedia: true,
  videoMedia: true,
  audioMedia: true,
} satisfies Prisma.LessonInclude;

type LessonRow = Prisma.LessonGetPayload<{ include: typeof lessonInclude }>;

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly storage: StorageService,
    private readonly childAccess: ChildAccessService,
  ) {}

  /**
   * Lists lessons.
   *
   * Two rules are enforced here and nowhere else:
   *  1. Only an admin may ask for non-published content.
   *  2. When a child is in context, the age band filter is derived from that
   *     child's date of birth — a parent cannot widen it by passing a query.
   */
  async list(
    user: RequestUser,
    query: LessonQueryDto,
  ): Promise<{ items: LessonDto[]; total: number }> {
    const isAdmin = user.role === "ADMIN";
    const locale = (query.locale ?? user.locale) as Locale;
    const prismaLocale = toPrismaLocale(locale);

    let ageCategories: string[] | undefined;
    if (query.childId) {
      const child = await this.childAccess.assertAccess(user, query.childId);
      ageCategories = accessibleAgeCategories(ageCategoryForDateOfBirth(child.dateOfBirth));
    } else if (query.ageCategory) {
      ageCategories = [query.ageCategory];
    }

    const where: Prisma.LessonWhereInput = {
      deletedAt: null,
      status: isAdmin ? (query.status ?? undefined) : "PUBLISHED",
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(ageCategories ? { ageCategory: { in: ageCategories as Prisma.EnumAgeCategoryFilter["in"] } } : {}),
      ...(query.search
        ? {
            translations: {
              some: { title: { contains: query.search, mode: "insensitive" } },
            },
          }
        : {}),
    };

    const orderBy = this.orderBy(query.sortBy, query.sortOrder);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.lesson.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        include: lessonInclude,
      }),
      this.prisma.lesson.count({ where }),
    ]);

    const progressByLesson = query.childId ? await this.progressMap(query.childId, rows.map((r) => r.id)) : null;

    return {
      total,
      items: rows.map((row) => this.toDto(row, prismaLocale, progressByLesson?.get(row.id) ?? null)),
    };
  }

  async findOne(user: RequestUser, idOrSlug: string, childId?: string, locale?: Locale): Promise<LessonDto> {
    const isAdmin = user.role === "ADMIN";
    const prismaLocale = toPrismaLocale(locale ?? user.locale);

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        ...(isAdmin ? {} : { status: "PUBLISHED" }),
      },
      include: {
        ...lessonInclude,
        blocks: {
          orderBy: { order: "asc" },
          include: {
            translations: true,
            media: true,
            question: {
              include: {
                translations: true,
                options: { orderBy: { order: "asc" }, include: { translations: true } },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw AppException.notFound("We couldn't find that lesson.", ErrorCode.LESSON_NOT_FOUND);
    }

    if (childId) await this.childAccess.assertAccess(user, childId);
    const progress = childId ? (await this.progressMap(childId, [lesson.id])).get(lesson.id) ?? null : null;

    const dto = this.toDto(lesson, prismaLocale, progress);
    dto.blocks = lesson.blocks.map((block) => {
      const translation = pickTranslation(block.translations, prismaLocale);
      const question = block.question;
      const questionTranslation = question ? pickTranslation(question.translations, prismaLocale) : undefined;

      return {
        id: block.id,
        order: block.order,
        type: block.type,
        title: translation?.title ?? null,
        body: translation?.body ?? null,
        glyph: block.glyph,
        sayIt: translation?.sayIt ?? null,
        mediaUrl: block.media ? this.storage.publicUrl(block.media.storageKey) : null,
        question: question
          ? {
              id: question.id,
              prompt: questionTranslation?.prompt ?? "",
              options: question.options.map((option) => ({
                id: option.id,
                glyph: option.glyph,
                label: pickTranslation(option.translations, prismaLocale)?.label ?? "",
              })),
              // Children never receive the answer key; grading happens on the
              // server when the lesson is completed.
              correctOptionId: isAdmin ? (question.options.find((o) => o.isCorrect)?.id ?? null) : null,
            }
          : null,
      } satisfies LessonBlockDto;
    });

    return dto;
  }

  async upsert(dto: UpsertLessonDto, id?: string): Promise<LessonDto> {
    const slug = dto.slug ?? slugify(dto.translations[0]?.title ?? "lesson");

    const data = {
      subjectId: dto.subjectId,
      categoryId: dto.categoryId ?? null,
      ageCategory: dto.ageCategory,
      difficulty: dto.difficulty,
      durationMinutes: dto.durationMinutes,
      xpReward: dto.xpReward,
      starReward: dto.starReward,
      glyph: dto.glyph,
      tone: dto.tone,
      coverMediaId: dto.coverMediaId ?? null,
      videoMediaId: dto.videoMediaId ?? null,
      audioMediaId: dto.audioMediaId ?? null,
    };

    const translations = dto.translations.map((t) => ({
      locale: toPrismaLocale(t.locale),
      title: t.title,
      description: t.description ?? "",
    }));

    const lesson = id
      ? await this.prisma.lesson.update({
          where: { id },
          data: { ...data, translations: { deleteMany: {}, create: translations } },
          include: lessonInclude,
        })
      : await this.prisma.lesson.create({
          data: { ...data, slug, status: "DRAFT", translations: { create: translations } },
          include: lessonInclude,
        });

    await this.invalidate();
    return this.toDto(lesson, toPrismaLocale("en"), null);
  }

  /**
   * Moves a lesson through the editorial workflow. `publishedAt` is stamped the
   * first time it goes live, and cleared if it is pulled back, so "new lesson"
   * notifications can key off it safely.
   */
  async changeStatus(id: string, dto: ChangeStatusDto): Promise<LessonDto> {
    const current = await this.prisma.lesson.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw AppException.notFound("We couldn't find that lesson.", ErrorCode.LESSON_NOT_FOUND);

    const goingLive = dto.status === "PUBLISHED" && current.status !== "PUBLISHED";

    const lesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        status: dto.status,
        publishedAt: goingLive ? new Date() : dto.status === "PUBLISHED" ? current.publishedAt : null,
      },
      include: lessonInclude,
    });

    await this.invalidate();
    return this.toDto(lesson, toPrismaLocale("en"), null);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.lesson.update({ where: { id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
    await this.invalidate();
  }

  /** Records how far through a lesson a child has read, without completing it. */
  async saveProgress(user: RequestUser, lessonId: string, childId: string, percent: number): Promise<void> {
    await this.childAccess.assertAccess(user, childId);
    const clamped = Math.max(0, Math.min(99, Math.round(percent)));

    await this.prisma.lessonProgress.upsert({
      where: { childId_lessonId: { childId, lessonId } },
      create: { childId, lessonId, percent: clamped },
      update: { percent: { set: clamped } },
    });
  }

  async invalidate(): Promise<void> {
    await this.cache.invalidatePrefix(CacheKeys.lessonsPrefix());
  }

  private async progressMap(childId: string, lessonIds: string[]) {
    if (lessonIds.length === 0) return new Map();
    const rows = await this.prisma.lessonProgress.findMany({
      where: { childId, lessonId: { in: lessonIds } },
    });
    return new Map(rows.map((row) => [row.lessonId, row]));
  }

  private orderBy(sortBy: string | undefined, direction: "asc" | "desc"): Prisma.LessonOrderByWithRelationInput {
    switch (sortBy) {
      case "completions":
        return { completions: direction };
      case "durationMinutes":
        return { durationMinutes: direction };
      case "createdAt":
        return { createdAt: direction };
      case "status":
        return { status: direction };
      default:
        return { updatedAt: direction };
    }
  }

  private toDto(
    lesson: LessonRow,
    locale: PrismaLocale,
    progress: { percent: number; completedAt: Date | null; starsEarned: number } | null,
  ): LessonDto {
    const translation = pickTranslation(lesson.translations, locale);
    const subjectTranslation = lesson.subject ? pickTranslation(lesson.subject.translations, locale) : undefined;

    return {
      id: lesson.id,
      slug: lesson.slug,
      title: translation?.title ?? lesson.slug,
      description: translation?.description ?? "",
      subjectId: lesson.subjectId,
      subject: lesson.subject
        ? {
            id: lesson.subject.id,
            slug: lesson.subject.slug,
            name: subjectTranslation?.name ?? lesson.subject.slug,
            description: subjectTranslation?.description ?? "",
            glyph: lesson.subject.glyph,
            tone: lesson.subject.tone,
            order: lesson.subject.order,
            lessonCount: 0,
          }
        : undefined,
      categoryId: lesson.categoryId,
      ageCategory: lesson.ageCategory,
      difficulty: lesson.difficulty,
      status: lesson.status,
      durationMinutes: lesson.durationMinutes,
      xpReward: lesson.xpReward,
      starReward: lesson.starReward,
      glyph: lesson.glyph,
      tone: lesson.tone,
      coverMediaUrl: lesson.coverMedia ? this.storage.publicUrl(lesson.coverMedia.storageKey) : null,
      videoMediaUrl: lesson.videoMedia ? this.storage.publicUrl(lesson.videoMedia.storageKey) : null,
      audioMediaUrl: lesson.audioMedia ? this.storage.publicUrl(lesson.audioMedia.storageKey) : null,
      completions: lesson.completions,
      createdAt: lesson.createdAt.toISOString(),
      updatedAt: lesson.updatedAt.toISOString(),
      publishedAt: lesson.publishedAt?.toISOString() ?? null,
      progress: progress
        ? {
            percent: progress.percent,
            completedAt: progress.completedAt?.toISOString() ?? null,
            starsEarned: progress.starsEarned,
          }
        : null,
    };
  }
}
