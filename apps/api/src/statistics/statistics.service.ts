import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  accuracyPercent,
  consistencyLevel,
  dayKeyInTimezone,
  effectiveStreak,
  type StatisticsPreset,
  type StatisticsSummaryDto,
  type SubjectStrengthDto,
  type TimeSeriesPointDto,
} from "@kidslearn/types";
import type { DailyStat } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { CacheKeys, CacheService } from "../common/redis/redis.service";
import { ChildAccessService } from "../children/child-access.service";
import { pickTranslation, toPrismaLocale } from "../common/utils/locale";
import type { AppConfig } from "../common/config/configuration";
import type { StatisticsQueryDto } from "./dto/statistics.dto";

const CACHE_TTL_SECONDS = 120;

/**
 * All windowed analytics read from the `DailyStat` roll-up rather than scanning
 * attempts, so a dashboard costs a handful of small indexed rows regardless of
 * how much a child has played.
 */
@Injectable()
export class StatisticsService {
  private readonly defaultTimezone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly childAccess: ChildAccessService,
    config: ConfigService,
  ) {
    this.defaultTimezone = config.getOrThrow<AppConfig>("app").timezone;
  }

  async summary(childId: string, query: StatisticsQueryDto, locale: string): Promise<StatisticsSummaryDto> {
    const timezone = await this.childAccess.timezoneForChild(childId, this.defaultTimezone);
    const range = this.resolveRange(query, timezone);
    const fingerprint = `${range.preset}:${range.from}:${range.to}:${query.subjectId ?? "all"}:${locale}`;

    return this.cache.remember(CacheKeys.statistics(childId, fingerprint), CACHE_TTL_SECONDS, async () => {
      const previous = this.previousWindow(range.from, range.to);

      const [current, prior, progress, subjectStrength, consistency] = await Promise.all([
        this.bucketsBetween(childId, range.from, range.to),
        this.bucketsBetween(childId, previous.from, previous.to),
        this.prisma.progress.findUnique({ where: { childId } }),
        this.subjectStrength(childId, locale),
        this.bucketsBetween(childId, this.shiftDays(range.to, -34), range.to),
      ]);

      const totals = this.totals(current);
      const previousTotals = this.totals(prior);
      const todayKey = dayKeyInTimezone(new Date(), timezone);

      return {
        range,
        learningSeconds: totals.learningSeconds,
        lessonsCompleted: totals.lessonsCompleted,
        gamesPlayed: totals.gamesPlayed,
        accuracy: accuracyPercent(totals.correctAnswers, totals.questionsAnswered),
        xpEarned: totals.xpEarned,
        starsEarned: totals.starsEarned,
        currentStreak: progress
          ? effectiveStreak(
              {
                currentStreak: progress.currentStreak,
                longestStreak: progress.longestStreak,
                lastActiveDayKey: progress.lastActiveDayKey,
              },
              todayKey,
            )
          : 0,
        longestStreak: progress?.longestStreak ?? 0,
        deltas: {
          learningSeconds: this.delta(totals.learningSeconds, previousTotals.learningSeconds),
          lessonsCompleted: this.delta(totals.lessonsCompleted, previousTotals.lessonsCompleted),
          gamesPlayed: this.delta(totals.gamesPlayed, previousTotals.gamesPlayed),
          accuracy:
            accuracyPercent(totals.correctAnswers, totals.questionsAnswered) -
            accuracyPercent(previousTotals.correctAnswers, previousTotals.questionsAnswered),
          xpEarned: this.delta(totals.xpEarned, previousTotals.xpEarned),
          starsEarned: this.delta(totals.starsEarned, previousTotals.starsEarned),
        },
        series: {
          learningMinutes: this.series(current, range, (b) => Math.round(b.learningSeconds / 60)),
          lessons: this.series(current, range, (b) => b.lessonsCompleted),
          accuracy: this.series(current, range, (b) => accuracyPercent(b.correctAnswers, b.questionsAnswered)),
          xp: this.series(current, range, (b) => b.xpEarned),
        },
        subjectStrength,
        consistency: this.consistencyGrid(consistency, range.to),
      } satisfies StatisticsSummaryDto;
    });
  }

  async subjectStrength(childId: string, locale: string): Promise<SubjectStrengthDto[]> {
    const prismaLocale = toPrismaLocale(locale);
    const stats = await this.prisma.subjectStat.findMany({
      where: { progress: { childId } },
      include: { subject: { include: { translations: true } } },
      orderBy: { score: "desc" },
    });

    return stats
      .filter((stat) => stat.totalAnswers > 0)
      .map((stat) => ({
        subjectId: stat.subjectId,
        subjectName: pickTranslation(stat.subject.translations, prismaLocale)?.name ?? stat.subject.slug,
        glyph: stat.subject.glyph,
        tone: stat.subject.tone,
        score: stat.score,
        trend: stat.score - stat.previousScore,
        totalAnswers: stat.totalAnswers,
        correctAnswers: stat.correctAnswers,
      }));
  }

  /**
   * Weak subjects, worst first. This is the input the recommendation engine
   * consumes; it deliberately ignores subjects with too little data to judge.
   */
  async weakSubjects(childId: string, locale: string, minimumAnswers = 5): Promise<SubjectStrengthDto[]> {
    const strengths = await this.subjectStrength(childId, locale);
    return strengths
      .filter((entry) => entry.totalAnswers >= minimumAnswers)
      .sort((a, b) => a.score - b.score);
  }

  private async bucketsBetween(childId: string, from: string, to: string): Promise<DailyStat[]> {
    return this.prisma.dailyStat.findMany({
      where: { childId, dayKey: { gte: from, lte: to } },
      orderBy: { dayKey: "asc" },
    });
  }

  private totals(buckets: DailyStat[]) {
    return buckets.reduce(
      (sum, bucket) => ({
        learningSeconds: sum.learningSeconds + bucket.learningSeconds,
        lessonsCompleted: sum.lessonsCompleted + bucket.lessonsCompleted,
        gamesPlayed: sum.gamesPlayed + bucket.gamesPlayed,
        questionsAnswered: sum.questionsAnswered + bucket.questionsAnswered,
        correctAnswers: sum.correctAnswers + bucket.correctAnswers,
        xpEarned: sum.xpEarned + bucket.xpEarned,
        starsEarned: sum.starsEarned + bucket.starsEarned,
      }),
      {
        learningSeconds: 0,
        lessonsCompleted: 0,
        gamesPlayed: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        xpEarned: 0,
        starsEarned: 0,
      },
    );
  }

  /** Percentage change, treating "from nothing" as +100 rather than infinity. */
  private delta(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Emits one point per day in the range, including days with no activity, so
   * charts show real gaps instead of silently compressing them.
   */
  private series(
    buckets: DailyStat[],
    range: { from: string; to: string },
    value: (bucket: DailyStat) => number,
  ): TimeSeriesPointDto[] {
    const byDay = new Map(buckets.map((bucket) => [bucket.dayKey, bucket]));
    const points: TimeSeriesPointDto[] = [];

    for (let day = range.from; day <= range.to; day = this.shiftDays(day, 1)) {
      const bucket = byDay.get(day);
      points.push({
        label: this.shortLabel(day),
        date: day,
        value: bucket ? value(bucket) : 0,
      });
      if (points.length > 400) break;
    }
    return points;
  }

  private consistencyGrid(buckets: DailyStat[], endDay: string): Array<{ date: string; level: number }> {
    const byDay = new Map(buckets.map((bucket) => [bucket.dayKey, bucket]));
    const grid: Array<{ date: string; level: number }> = [];
    for (let offset = 34; offset >= 0; offset -= 1) {
      const day = this.shiftDays(endDay, -offset);
      grid.push({ date: day, level: consistencyLevel(byDay.get(day)?.learningSeconds ?? 0) });
    }
    return grid;
  }

  private resolveRange(query: StatisticsQueryDto, timezone: string) {
    const preset: StatisticsPreset = query.preset ?? "week";
    const today = dayKeyInTimezone(new Date(), timezone);

    if (preset === "custom" && query.from && query.to) {
      return { from: query.from, to: query.to, preset };
    }

    const spans: Record<Exclude<StatisticsPreset, "custom">, number> = {
      today: 0,
      week: 6,
      month: 29,
      year: 364,
    };
    const span = spans[preset as Exclude<StatisticsPreset, "custom">] ?? 6;
    return { from: this.shiftDays(today, -span), to: today, preset };
  }

  private previousWindow(from: string, to: string) {
    const length = Math.max(1, this.daysBetween(from, to) + 1);
    return { from: this.shiftDays(from, -length), to: this.shiftDays(from, -1) };
  }

  private shiftDays(dayKey: string, days: number): string {
    const date = new Date(`${dayKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private daysBetween(from: string, to: string): number {
    return Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
    );
  }

  private shortLabel(dayKey: string): string {
    const date = new Date(`${dayKey}T00:00:00.000Z`);
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(date);
  }
}
