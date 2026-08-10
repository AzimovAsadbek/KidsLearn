import { Injectable, Logger } from "@nestjs/common";
import {
  AiJobStatus,
  AiJobType,
  ContentStatus,
  MediaKind,
  RecommendationSource,
  ageCategoryForDateOfBirth,
  accessibleAgeCategories,
  accuracyPercent,
  type AiJobDto,
  type AiProviderStatusDto,
  type RecommendationDto,
} from "@kidslearn/types";
import type { Prisma } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { AppException } from "../common/errors/app-exception";
import { MediaService } from "../media/media.module";
import { StatisticsService } from "../statistics/statistics.service";
import { pickTranslation, toPrismaLocale } from "../common/utils/locale";
import { AiProviderFactory } from "./providers";
import type { GenerateImageDto } from "./dto/ai.dto";

/** Recommendations are cached for a day; they should feel stable, not twitchy. */
const RECOMMENDATION_TTL_HOURS = 24;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: AiProviderFactory,
    private readonly media: MediaService,
    private readonly statistics: StatisticsService,
  ) {}

  /** Honest capability report the admin UI renders verbatim. */
  status(): AiProviderStatusDto {
    return {
      imageGeneration: {
        configured: this.providers.image.configured,
        provider: this.providers.image.name,
        mode: this.providers.image.configured ? "live" : "preview",
      },
      recommendations: {
        configured: this.providers.recommendation.configured,
        provider: this.providers.recommendation.name,
        mode: this.providers.recommendation.name === "rule-based" ? "rule-based" : "live",
      },
    };
  }

  /* --- Image generation --------------------------------------------------- */

  async generateImage(dto: GenerateImageDto, requestedById: string): Promise<AiJobDto> {
    const provider = this.providers.image;

    const job = await this.prisma.aiJob.create({
      data: {
        type: AiJobType.IMAGE_GENERATION,
        status: AiJobStatus.RUNNING,
        prompt: dto.prompt,
        style: dto.style ?? null,
        ageCategory: dto.ageCategory ?? null,
        subjectId: dto.subjectId ?? null,
        provider: provider.name,
        requestedById,
      },
    });

    try {
      const image = await provider.generate({
        prompt: dto.prompt,
        style: dto.style,
        ageCategory: dto.ageCategory,
      });

      const media = await this.media.store({
        buffer: image.buffer,
        originalName: image.filename,
        kind: MediaKind.GENERATED,
        createdById: requestedById,
        aiPrompt: dto.prompt,
        // Generated assets are never published straight to children.
        status: ContentStatus.REVIEW,
      });

      const completed = await this.prisma.aiJob.update({
        where: { id: job.id },
        data: {
          // Preview output is labelled as such rather than reported as a
          // successful generation.
          status: provider.configured ? AiJobStatus.AWAITING_REVIEW : AiJobStatus.PREVIEW_ONLY,
          mediaId: media.id,
          completedAt: new Date(),
        },
        include: aiJobInclude,
      });

      return this.toDto(completed);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`AI image job ${job.id} failed: ${message}`);
      const failed = await this.prisma.aiJob.update({
        where: { id: job.id },
        data: { status: AiJobStatus.FAILED, error: message.slice(0, 500), completedAt: new Date() },
        include: aiJobInclude,
      });
      return this.toDto(failed);
    }
  }

  async listJobs(params: { skip: number; take: number; status?: AiJobStatus }) {
    const where: Prisma.AiJobWhereInput = {
      type: AiJobType.IMAGE_GENERATION,
      ...(params.status ? { status: params.status } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.aiJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        include: aiJobInclude,
      }),
      this.prisma.aiJob.count({ where }),
    ]);

    return { items: rows.map((row) => this.toDto(row)), total };
  }

  /**
   * Human review gate. Approving publishes the asset into the media library;
   * rejecting leaves it in review so it never reaches a child.
   */
  async review(jobId: string, approve: boolean, reviewerId: string, note?: string): Promise<AiJobDto> {
    const job = await this.prisma.aiJob.findUnique({ where: { id: jobId }, include: aiJobInclude });
    if (!job) throw AppException.notFound("That generation job no longer exists.");
    if (job.status === AiJobStatus.FAILED) {
      throw AppException.badRequest("A failed generation can't be reviewed.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.aiReview.upsert({
        where: { jobId },
        create: { jobId, reviewerId, approved: approve, note: note ?? null },
        update: { reviewerId, approved: approve, note: note ?? null },
      });

      if (job.mediaId) {
        await tx.media.update({
          where: { id: job.mediaId },
          data: { status: approve ? ContentStatus.PUBLISHED : ContentStatus.ARCHIVED },
        });
      }

      return tx.aiJob.update({
        where: { id: jobId },
        data: { status: approve ? AiJobStatus.APPROVED : AiJobStatus.REJECTED },
        include: aiJobInclude,
      });
    });

    return this.toDto(updated);
  }

  /* --- Recommendations ---------------------------------------------------- */

  /**
   * Returns the child's active recommendation, generating one only when the
   * cached row has expired. This is what keeps the engine off the page-load
   * path — a dashboard render never triggers a provider call.
   */
  async recommendationFor(childId: string, locale: string): Promise<RecommendationDto | null> {
    const existing = await this.prisma.recommendation.findFirst({
      where: { childId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: { subject: { include: { translations: true } }, lesson: { include: { translations: true } } },
    });
    if (existing) return this.toRecommendationDto(existing, locale);

    return this.generateRecommendation(childId, locale);
  }

  async generateRecommendation(childId: string, locale: string): Promise<RecommendationDto | null> {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, deletedAt: null },
      include: { progress: true },
    });
    if (!child) return null;

    const prismaLocale = toPrismaLocale(locale);
    const [weak, strong] = await Promise.all([
      this.statistics.weakSubjects(childId, locale),
      this.statistics.subjectStrength(childId, locale),
    ]);

    // Prefer an unfinished lesson in the weakest subject, inside the child's
    // age band — the recommendation must always be actionable.
    const targetSubjectId = weak[0]?.subjectId ?? child.favouriteSubjectId ?? undefined;
    const bands = accessibleAgeCategories(ageCategoryForDateOfBirth(child.dateOfBirth));

    const candidate = await this.prisma.lesson.findFirst({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        ageCategory: { in: bands as Prisma.EnumAgeCategoryFilter["in"] },
        ...(targetSubjectId ? { subjectId: targetSubjectId } : {}),
        progress: { none: { childId, completedAt: { not: null } } },
      },
      orderBy: [{ difficulty: "asc" }, { completions: "desc" }],
      include: { translations: true, subject: { include: { translations: true } } },
    });

    const generated = await this.providers.recommendation.generate({
      childName: child.name,
      ageCategory: ageCategoryForDateOfBirth(child.dateOfBirth),
      weakSubjects: weak.map((entry) => ({ name: entry.subjectName, score: entry.score })),
      strongSubjects: strong.map((entry) => ({ name: entry.subjectName, score: entry.score })),
      currentStreak: child.progress?.currentStreak ?? 0,
      recentAccuracy: accuracyPercent(
        child.progress?.correctAnswers ?? 0,
        child.progress?.questionsAnswered ?? 0,
      ),
      candidateLesson: candidate
        ? {
            id: candidate.id,
            slug: candidate.slug,
            title: pickTranslation(candidate.translations, prismaLocale)?.title ?? candidate.slug,
            subjectName: pickTranslation(candidate.subject.translations, prismaLocale)?.name ?? "",
            minutes: candidate.durationMinutes,
          }
        : null,
    });

    const row = await this.prisma.recommendation.create({
      data: {
        childId,
        headline: generated.headline,
        rationale: generated.rationale,
        actionLabel: "Start lesson",
        subjectId: targetSubjectId ?? null,
        lessonId: candidate?.id ?? null,
        minutes: generated.minutes,
        confidence: generated.confidence,
        source:
          this.providers.recommendation.name === "rule-based"
            ? RecommendationSource.RULE_BASED
            : RecommendationSource.AI,
        expiresAt: new Date(Date.now() + RECOMMENDATION_TTL_HOURS * 3_600_000),
      },
      include: { subject: { include: { translations: true } }, lesson: { include: { translations: true } } },
    });

    return this.toRecommendationDto(row, locale);
  }

  /* --- mapping ------------------------------------------------------------ */

  private toDto(job: Prisma.AiJobGetPayload<{ include: typeof aiJobInclude }>): AiJobDto {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      prompt: job.prompt,
      style: job.style,
      ageCategory: job.ageCategory,
      subjectId: job.subjectId,
      provider: job.provider,
      media: job.media ? this.media.toDto({ ...job.media, createdBy: null }) : null,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
      reviewedByName: job.review?.reviewer?.name ?? null,
      reviewNote: job.review?.note ?? null,
    };
  }

  private toRecommendationDto(
    row: Prisma.RecommendationGetPayload<{
      include: { subject: { include: { translations: true } }; lesson: { include: { translations: true } } };
    }>,
    locale: string,
  ): RecommendationDto {
    const prismaLocale = toPrismaLocale(locale);
    return {
      id: row.id,
      childId: row.childId,
      headline: row.headline,
      rationale: row.rationale,
      actionLabel: row.actionLabel,
      subjectId: row.subjectId,
      subjectName: row.subject ? (pickTranslation(row.subject.translations, prismaLocale)?.name ?? null) : null,
      lessonId: row.lessonId,
      lessonSlug: row.lesson?.slug ?? null,
      minutes: row.minutes,
      confidence: row.confidence,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    };
  }
}

const aiJobInclude = {
  media: true,
  review: { include: { reviewer: true } },
} satisfies Prisma.AiJobInclude;
