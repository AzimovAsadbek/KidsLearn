import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ActivityType,
  applyActivityToStreak,
  dayKeyInTimezone,
  type AchievementDto,
  type ChildProgressDto,
} from "@kidslearn/types";
import type { Prisma } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { CacheKeys, CacheService } from "../common/redis/redis.service";
import { ChildrenService } from "../children/children.service";
import { ChildAccessService } from "../children/child-access.service";
import { AchievementsService } from "./achievements.service";
import type { AppConfig } from "../common/config/configuration";

export interface LearningGains {
  childId: string;
  subjectId: string | null;
  xp: number;
  stars: number;
  durationSeconds: number;
  questionsAnswered: number;
  correctAnswers: number;
  lessonCompleted?: boolean;
  gamePlayed?: boolean;
  activity: {
    type: ActivityType;
    title: string;
    detail: string;
    glyph: string;
    tone: string;
    refId?: string;
  };
}

export interface AppliedGains {
  progress: ChildProgressDto;
  unlockedAchievements: AchievementDto[];
  streakExtended: boolean;
}

/**
 * The single writer for everything that counts as "learning happened".
 *
 * Lessons and games both funnel through `apply()`, so XP, stars, the daily
 * bucket, the streak, subject accuracy, the activity feed and achievement
 * evaluation can never drift apart or be half-applied. The whole update runs in
 * one transaction.
 */
@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);
  private readonly defaultTimezone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly children: ChildrenService,
    private readonly childAccess: ChildAccessService,
    private readonly achievements: AchievementsService,
    config: ConfigService,
  ) {
    this.defaultTimezone = config.getOrThrow<AppConfig>("app").timezone;
  }

  async apply(gains: LearningGains): Promise<AppliedGains> {
    const timezone = await this.childAccess.timezoneForChild(gains.childId, this.defaultTimezone);
    const now = new Date();
    const dayKey = dayKeyInTimezone(now, timezone);

    const { progress, streakExtended } = await this.prisma.$transaction(async (tx) => {
      const current = await tx.progress.findUniqueOrThrow({ where: { childId: gains.childId } });

      // The streak is recomputed from the stored day key rather than a counter,
      // so a late offline sync or two sessions in one day can't inflate it.
      const nextStreak = applyActivityToStreak(
        {
          currentStreak: current.currentStreak,
          longestStreak: current.longestStreak,
          lastActiveDayKey: current.lastActiveDayKey,
        },
        dayKey,
      );
      const extended = nextStreak.currentStreak > current.currentStreak || current.lastActiveDayKey === null;

      const updated = await tx.progress.update({
        where: { childId: gains.childId },
        data: {
          xp: { increment: gains.xp },
          stars: { increment: gains.stars },
          points: { increment: gains.xp + gains.stars * 2 },
          learningSeconds: { increment: gains.durationSeconds },
          questionsAnswered: { increment: gains.questionsAnswered },
          correctAnswers: { increment: gains.correctAnswers },
          wrongAnswers: { increment: Math.max(0, gains.questionsAnswered - gains.correctAnswers) },
          lessonsCompleted: gains.lessonCompleted ? { increment: 1 } : undefined,
          gamesPlayed: gains.gamePlayed ? { increment: 1 } : undefined,
          currentStreak: nextStreak.currentStreak,
          longestStreak: nextStreak.longestStreak,
          lastActiveDayKey: nextStreak.lastActiveDayKey,
          lastActivityAt: now,
        },
      });

      await tx.dailyStat.upsert({
        where: { childId_dayKey: { childId: gains.childId, dayKey } },
        create: {
          childId: gains.childId,
          dayKey,
          date: new Date(`${dayKey}T00:00:00.000Z`),
          learningSeconds: gains.durationSeconds,
          lessonsCompleted: gains.lessonCompleted ? 1 : 0,
          gamesPlayed: gains.gamePlayed ? 1 : 0,
          questionsAnswered: gains.questionsAnswered,
          correctAnswers: gains.correctAnswers,
          xpEarned: gains.xp,
          starsEarned: gains.stars,
        },
        update: {
          learningSeconds: { increment: gains.durationSeconds },
          lessonsCompleted: gains.lessonCompleted ? { increment: 1 } : undefined,
          gamesPlayed: gains.gamePlayed ? { increment: 1 } : undefined,
          questionsAnswered: { increment: gains.questionsAnswered },
          correctAnswers: { increment: gains.correctAnswers },
          xpEarned: { increment: gains.xp },
          starsEarned: { increment: gains.stars },
        },
      });

      if (gains.subjectId && gains.questionsAnswered > 0) {
        await this.updateSubjectStat(tx, updated.id, gains);
      }

      await tx.activity.create({
        data: {
          childId: gains.childId,
          type: gains.activity.type,
          title: gains.activity.title,
          detail: gains.activity.detail,
          glyph: gains.activity.glyph,
          tone: gains.activity.tone,
          xp: gains.xp || null,
          stars: gains.stars || null,
          refId: gains.activity.refId ?? null,
        },
      });

      if (extended && nextStreak.currentStreak > 1) {
        await tx.activity.create({
          data: {
            childId: gains.childId,
            type: ActivityType.STREAK_EXTENDED,
            title: `${nextStreak.currentStreak}-day streak`,
            detail: "Learning on consecutive days",
            glyph: "🔥",
            tone: "coral",
          },
        });
      }

      return { progress: updated, streakExtended: extended };
    });

    // Achievements run after the transaction commits so their own writes and
    // notifications can't roll back the learning that earned them.
    const unlocked = await this.achievements.evaluate(gains.childId).catch((error: Error) => {
      this.logger.error(`Achievement evaluation failed for ${gains.childId}: ${error.message}`);
      return [] as AchievementDto[];
    });

    await this.cache.invalidatePrefix(CacheKeys.statisticsPrefix(gains.childId));

    const today = await this.prisma.dailyStat.findUnique({
      where: { childId_dayKey: { childId: gains.childId, dayKey } },
    });

    return {
      progress: this.children.toProgressDto(progress, today, timezone),
      unlockedAchievements: unlocked,
      streakExtended,
    };
  }

  /**
   * Keeps a rolling per-subject accuracy score. `previousScore` is only moved
   * when the sample is large enough to be meaningful, which is what makes the
   * trend arrow stable rather than jittery.
   */
  private async updateSubjectStat(
    tx: Prisma.TransactionClient,
    progressId: string,
    gains: LearningGains,
  ): Promise<void> {
    if (!gains.subjectId) return;

    const existing = await tx.subjectStat.findUnique({
      where: { progressId_subjectId: { progressId, subjectId: gains.subjectId } },
    });

    const totalAnswers = (existing?.totalAnswers ?? 0) + gains.questionsAnswered;
    const correctAnswers = (existing?.correctAnswers ?? 0) + gains.correctAnswers;
    const score = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    const shouldSnapshot = !existing || totalAnswers - (existing.totalAnswers ?? 0) >= 20;

    await tx.subjectStat.upsert({
      where: { progressId_subjectId: { progressId, subjectId: gains.subjectId } },
      create: {
        progressId,
        subjectId: gains.subjectId,
        totalAnswers,
        correctAnswers,
        score,
        previousScore: score,
      },
      update: {
        totalAnswers,
        correctAnswers,
        score,
        previousScore: shouldSnapshot ? (existing?.score ?? score) : undefined,
      },
    });
  }

  /** Current progress for a child, with today's bucket attached. */
  async forChild(childId: string): Promise<ChildProgressDto> {
    const timezone = await this.childAccess.timezoneForChild(childId, this.defaultTimezone);
    const dayKey = dayKeyInTimezone(new Date(), timezone);

    const [progress, today] = await Promise.all([
      this.prisma.progress.findUniqueOrThrow({ where: { childId } }),
      this.prisma.dailyStat.findUnique({ where: { childId_dayKey: { childId, dayKey } } }),
    ]);

    return this.children.toProgressDto(progress, today, timezone);
  }

  async activityFeed(childId: string, skip: number, take: number) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where: { childId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.activity.count({ where: { childId } }),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        childId: row.childId,
        type: row.type,
        title: row.title,
        detail: row.detail,
        glyph: row.glyph,
        tone: row.tone,
        xp: row.xp,
        stars: row.stars,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }
}
