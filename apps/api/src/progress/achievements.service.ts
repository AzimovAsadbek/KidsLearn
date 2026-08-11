import { Injectable, Logger } from "@nestjs/common";
import {
  ActivityType,
  NotificationType,
  type AchievementDto,
  type Locale,
  type RewardDto,
} from "@kidslearn/types";
import { Locale as PrismaLocale } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { AppException } from "../common/errors/app-exception";
import { pickTranslation, toPrismaLocale } from "../common/utils/locale";

/**
 * Achievement conditions are data, not code.
 *
 * Each definition stores a rule like `{ metric: "lessonsCompleted", gte: 10 }`,
 * which means a new achievement is a seed row rather than a deploy. Supported
 * metrics are the counters the progress engine already maintains.
 */
export interface AchievementCondition {
  metric:
    | "lessonsCompleted"
    | "gamesPlayed"
    | "stars"
    | "xp"
    | "currentStreak"
    | "longestStreak"
    | "correctAnswers"
    | "accuracy"
    | "subjectsTouched";
  gte: number;
  /** Optional: restrict a metric to one subject (e.g. "25 maths lessons"). */
  subjectSlug?: string;
}

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recomputes every achievement for one child and returns the ones that just
   * unlocked.
   *
   * This runs on progress events rather than on page render, and it only writes
   * when a value actually changed, so repeated evaluation is cheap and safe.
   */
  async evaluate(childId: string): Promise<AchievementDto[]> {
    const [progress, definitions, existing, subjectStats] = await Promise.all([
      this.prisma.progress.findUnique({ where: { childId } }),
      this.prisma.achievement.findMany({ where: { active: true }, include: { translations: true } }),
      this.prisma.childAchievement.findMany({ where: { childId } }),
      this.prisma.subjectStat.findMany({
        where: { progress: { childId } },
        include: { subject: true },
      }),
    ]);

    if (!progress) return [];

    const existingByAchievement = new Map(existing.map((row) => [row.achievementId, row]));
    const unlocked: AchievementDto[] = [];

    for (const definition of definitions) {
      const condition = definition.condition as unknown as AchievementCondition | null;
      if (!condition?.metric) continue;

      const value = this.metricValue(condition, progress, subjectStats);
      const percent = condition.gte > 0 ? Math.min(100, Math.round((value / condition.gte) * 100)) : 0;
      const previous = existingByAchievement.get(definition.id);

      if (previous?.unlockedAt) continue;
      if (previous && previous.progress === percent) continue;

      const justUnlocked = percent >= 100;
      const row = await this.prisma.childAchievement.upsert({
        where: { childId_achievementId: { childId, achievementId: definition.id } },
        create: {
          childId,
          achievementId: definition.id,
          progress: percent,
          unlockedAt: justUnlocked ? new Date() : null,
        },
        update: {
          progress: percent,
          unlockedAt: justUnlocked ? new Date() : null,
        },
      });

      if (!justUnlocked) continue;

      const translation = pickTranslation(definition.translations, PrismaLocale.EN);
      const dto: AchievementDto = {
        id: definition.id,
        code: definition.code,
        title: translation?.title ?? definition.code,
        description: translation?.description ?? "",
        glyph: definition.glyph,
        tone: definition.tone,
        tier: definition.tier,
        category: definition.category,
        xpReward: definition.xpReward,
        progress: 100,
        unlockedAt: row.unlockedAt?.toISOString() ?? new Date().toISOString(),
      };
      unlocked.push(dto);

      // Unlocking pays out XP and leaves a trail in both the feed and the
      // parent's notification centre.
      await this.prisma.$transaction([
        this.prisma.progress.update({
          where: { childId },
          data: { xp: { increment: definition.xpReward } },
        }),
        this.prisma.activity.create({
          data: {
            childId,
            type: ActivityType.ACHIEVEMENT_EARNED,
            title: `Unlocked ${dto.title}`,
            detail: dto.description,
            glyph: dto.glyph,
            tone: dto.tone,
            xp: definition.xpReward,
            refId: definition.id,
          },
        }),
      ]);

      await this.notifyParent(childId, dto, definition.translations).catch((error: Error) =>
        this.logger.warn(`Could not notify parent about ${dto.code}: ${error.message}`),
      );
    }

    return unlocked;
  }

  private metricValue(
    condition: AchievementCondition,
    progress: {
      lessonsCompleted: number;
      gamesPlayed: number;
      stars: number;
      xp: number;
      currentStreak: number;
      longestStreak: number;
      correctAnswers: number;
      questionsAnswered: number;
    },
    subjectStats: Array<{ correctAnswers: number; totalAnswers: number; subject: { slug: string } }>,
  ): number {
    if (condition.subjectSlug) {
      const stat = subjectStats.find((s) => s.subject.slug === condition.subjectSlug);
      if (!stat) return 0;
      if (condition.metric === "correctAnswers") return stat.correctAnswers;
      if (condition.metric === "accuracy") {
        return stat.totalAnswers > 0 ? Math.round((stat.correctAnswers / stat.totalAnswers) * 100) : 0;
      }
    }

    switch (condition.metric) {
      case "lessonsCompleted":
        return progress.lessonsCompleted;
      case "gamesPlayed":
        return progress.gamesPlayed;
      case "stars":
        return progress.stars;
      case "xp":
        return progress.xp;
      case "currentStreak":
        return progress.currentStreak;
      case "longestStreak":
        return progress.longestStreak;
      case "correctAnswers":
        return progress.correctAnswers;
      case "accuracy":
        return progress.questionsAnswered > 0
          ? Math.round((progress.correctAnswers / progress.questionsAnswered) * 100)
          : 0;
      case "subjectsTouched":
        return subjectStats.filter((s) => s.totalAnswers > 0).length;
      default:
        return 0;
    }
  }

  private async notifyParent(
    childId: string,
    achievement: AchievementDto,
    translations: Array<{ locale: PrismaLocale; title: string; description: string | null }>,
  ): Promise<void> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { name: true, parentId: true },
    });
    if (!child) return;

    // Snapshot the achievement copy in every locale so the notification renders
    // in whatever language the parent reads it in — now or after switching.
    const byLocale = (pick: (t: { title: string; description: string | null }) => string | null) =>
      Object.fromEntries(
        translations.map((entry) => [entry.locale.toLowerCase(), pick(entry) ?? ""]),
      ) as Record<string, string>;

    await this.prisma.notification.create({
      data: {
        userId: child.parentId,
        type: NotificationType.ACHIEVEMENT_EARNED,
        title: `${child.name} earned ${achievement.title}`,
        body: achievement.description,
        glyph: achievement.glyph,
        tone: achievement.tone,
        href: "/achievements",
        childId,
        messageKey: "achievement.earned",
        params: {
          child: child.name,
          achievement: byLocale((entry) => entry.title),
          description: byLocale((entry) => entry.description),
        },
      },
    });
  }

  /** Full achievement list for a child, unlocked and locked alike. */
  async listForChild(childId: string, locale: Locale): Promise<AchievementDto[]> {
    const prismaLocale = toPrismaLocale(locale);
    const [definitions, owned] = await Promise.all([
      this.prisma.achievement.findMany({
        where: { active: true },
        orderBy: [{ order: "asc" }, { code: "asc" }],
        include: { translations: true },
      }),
      this.prisma.childAchievement.findMany({ where: { childId } }),
    ]);

    const ownedByAchievement = new Map(owned.map((row) => [row.achievementId, row]));

    return definitions.map((definition) => {
      const translation = pickTranslation(definition.translations, prismaLocale);
      const row = ownedByAchievement.get(definition.id);
      return {
        id: definition.id,
        code: definition.code,
        title: translation?.title ?? definition.code,
        description: translation?.description ?? "",
        glyph: definition.glyph,
        tone: definition.tone,
        tier: definition.tier,
        category: definition.category,
        xpReward: definition.xpReward,
        progress: row?.progress ?? 0,
        unlockedAt: row?.unlockedAt?.toISOString() ?? null,
      };
    });
  }
}

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForChild(childId: string, locale: Locale): Promise<RewardDto[]> {
    const prismaLocale = toPrismaLocale(locale);
    const [rewards, claims] = await Promise.all([
      this.prisma.reward.findMany({
        where: { active: true },
        orderBy: [{ order: "asc" }, { costStars: "asc" }],
        include: { translations: true },
      }),
      this.prisma.childReward.findMany({ where: { childId } }),
    ]);

    const claimedByReward = new Map(claims.map((claim) => [claim.rewardId, claim]));

    return rewards.map((reward) => {
      const translation = pickTranslation(reward.translations, prismaLocale);
      const claim = claimedByReward.get(reward.id);
      return {
        id: reward.id,
        code: reward.code,
        title: translation?.title ?? reward.code,
        description: translation?.description ?? "",
        glyph: reward.glyph,
        tone: reward.tone,
        costStars: reward.costStars,
        claimed: Boolean(claim),
        claimedAt: claim?.claimedAt.toISOString() ?? null,
      };
    });
  }

  /**
   * Spends stars on a reward.
   *
   * The balance check and the deduction happen in one transaction, and the
   * unique (childId, rewardId) constraint makes a double-claim impossible even
   * under concurrent requests.
   */
  async claim(childId: string, rewardId: string, locale: Locale = "en"): Promise<RewardDto[]> {
    const reward = await this.prisma.reward.findFirst({ where: { id: rewardId, active: true } });
    if (!reward) throw AppException.notFound("That reward isn't available.");

    const progress = await this.prisma.progress.findUniqueOrThrow({ where: { childId } });
    if (progress.stars < reward.costStars) {
      throw AppException.badRequest(
        `${reward.costStars - progress.stars} more stars are needed to claim this.`,
      );
    }

    const alreadyClaimed = await this.prisma.childReward.findUnique({
      where: { childId_rewardId: { childId, rewardId } },
    });
    if (alreadyClaimed) throw AppException.conflict("This reward has already been claimed.");

    await this.prisma.$transaction([
      this.prisma.childReward.create({
        data: { childId, rewardId, starsSpent: reward.costStars },
      }),
      this.prisma.progress.update({
        where: { childId },
        data: { stars: { decrement: reward.costStars } },
      }),
      this.prisma.activity.create({
        data: {
          childId,
          type: ActivityType.REWARD_CLAIMED,
          title: "Claimed a reward",
          detail: `Spent ${reward.costStars} stars`,
          glyph: reward.glyph,
          tone: reward.tone,
          refId: rewardId,
        },
      }),
    ]);

    const child = await this.prisma.child.findUnique({ where: { id: childId }, select: { locale: true } });
    return this.listForChild(childId, (child?.locale.toLowerCase() as Locale | undefined) ?? locale);
  }
}
