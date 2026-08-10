import { Injectable } from "@nestjs/common";
import { ContentStatus, type CategoryDto, type Locale, type SubjectDto } from "@kidslearn/types";
import { Locale as PrismaLocale } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { CacheKeys, CacheService } from "../common/redis/redis.service";
import { AppException } from "../common/errors/app-exception";
import { pickTranslation, toPrismaLocale } from "../common/utils/locale";
import type { UpsertCategoryDto, UpsertSubjectDto } from "./dto/content.dto";

@Injectable()
export class SubjectsService {
  private static readonly TTL_SECONDS = 600;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Subjects change rarely and are read on almost every screen, so they are the
   * clearest cache win in the product.
   */
  async list(locale: Locale): Promise<SubjectDto[]> {
    return this.cache.remember(CacheKeys.subjects(locale), SubjectsService.TTL_SECONDS, async () => {
      const prismaLocale = toPrismaLocale(locale);
      const subjects = await this.prisma.subject.findMany({
        orderBy: [{ order: "asc" }, { slug: "asc" }],
        include: {
          translations: true,
          _count: { select: { lessons: { where: { status: "PUBLISHED", deletedAt: null } } } },
        },
      });

      return subjects.map((subject) => {
        const translation = pickTranslation(subject.translations, prismaLocale);
        return {
          id: subject.id,
          slug: subject.slug,
          name: translation?.name ?? subject.slug,
          description: translation?.description ?? "",
          glyph: subject.glyph,
          tone: subject.tone,
          order: subject.order,
          lessonCount: subject._count.lessons,
        } satisfies SubjectDto;
      });
    });
  }

  async upsert(dto: UpsertSubjectDto): Promise<SubjectDto> {
    const subject = await this.prisma.subject.upsert({
      where: { slug: dto.slug },
      create: {
        slug: dto.slug,
        glyph: dto.glyph,
        tone: dto.tone,
        order: dto.order ?? 0,
        translations: {
          create: dto.translations.map((t) => ({
            locale: toPrismaLocale(t.locale),
            name: t.title,
            description: t.description ?? "",
          })),
        },
      },
      update: {
        glyph: dto.glyph,
        tone: dto.tone,
        order: dto.order ?? 0,
        translations: {
          // Replacing the set keeps translations exactly as submitted, which is
          // what an editor expects from a form that shows all three languages.
          deleteMany: {},
          create: dto.translations.map((t) => ({
            locale: toPrismaLocale(t.locale),
            name: t.title,
            description: t.description ?? "",
          })),
        },
      },
      include: { translations: true, _count: { select: { lessons: true } } },
    });

    await this.invalidate();

    const translation = pickTranslation(subject.translations, PrismaLocale.EN);
    return {
      id: subject.id,
      slug: subject.slug,
      name: translation?.name ?? subject.slug,
      description: translation?.description ?? "",
      glyph: subject.glyph,
      tone: subject.tone,
      order: subject.order,
      lessonCount: subject._count.lessons,
    };
  }

  async remove(id: string): Promise<void> {
    const lessons = await this.prisma.lesson.count({ where: { subjectId: id, deletedAt: null } });
    if (lessons > 0) {
      throw AppException.conflict("Move or delete this subject's lessons before removing it.");
    }
    await this.prisma.subject.delete({ where: { id } });
    await this.invalidate();
  }

  async invalidate(): Promise<void> {
    await this.cache.del(CacheKeys.subjects("uz"), CacheKeys.subjects("ru"), CacheKeys.subjects("en"));
    await this.cache.invalidatePrefix(CacheKeys.lessonsPrefix());
  }
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subjects: SubjectsService,
  ) {}

  async list(params: {
    locale: Locale;
    subjectId?: string;
    status?: ContentStatus;
    search?: string;
    skip: number;
    take: number;
  }): Promise<{ items: CategoryDto[]; total: number }> {
    const prismaLocale = toPrismaLocale(params.locale);
    const where = {
      ...(params.subjectId ? { subjectId: params.subjectId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? { translations: { some: { name: { contains: params.search, mode: "insensitive" as const } } } }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: params.skip,
        take: params.take,
        include: { translations: true, _count: { select: { lessons: true } } },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: pickTranslation(row.translations, prismaLocale)?.name ?? row.slug,
        subjectId: row.subjectId,
        status: row.status,
        itemCount: row._count.lessons,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async upsert(dto: UpsertCategoryDto): Promise<CategoryDto> {
    const category = await this.prisma.category.upsert({
      where: { slug: dto.slug },
      create: {
        slug: dto.slug,
        subjectId: dto.subjectId,
        status: dto.status ?? ContentStatus.DRAFT,
        translations: {
          create: dto.translations.map((t) => ({ locale: toPrismaLocale(t.locale), name: t.title })),
        },
      },
      update: {
        subjectId: dto.subjectId,
        status: dto.status,
        translations: {
          deleteMany: {},
          create: dto.translations.map((t) => ({ locale: toPrismaLocale(t.locale), name: t.title })),
        },
      },
      include: { translations: true, _count: { select: { lessons: true } } },
    });

    await this.subjects.invalidate();

    return {
      id: category.id,
      slug: category.slug,
      name: pickTranslation(category.translations, PrismaLocale.EN)?.name ?? category.slug,
      subjectId: category.subjectId,
      status: category.status,
      itemCount: category._count.lessons,
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  async remove(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
    await this.subjects.invalidate();
  }
}
