import { Controller, Get, Global, Injectable, Logger, Module, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LeaderboardPeriod, type LeaderboardDto, type LeaderboardEntryDto } from "@kidslearn/types";
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PrismaService } from "../common/prisma/prisma.service";
import { CacheKeys, CacheService } from "../common/redis/redis.service";
import { queuesDisabled } from "../queue/queue.module";
import { CurrentUser, type RequestUser } from "../common/decorators";
import { ChildAccessService } from "../children/child-access.service";

export class LeaderboardQueryDto {
  @ApiPropertyOptional({ enum: LeaderboardPeriod, default: LeaderboardPeriod.WEEKLY })
  @IsOptional()
  @IsEnum(LeaderboardPeriod)
  period?: LeaderboardPeriod;

  @ApiPropertyOptional({ format: "uuid", description: "Highlights this child and returns their row" })
  @IsOptional()
  @IsUUID()
  childId?: string;

  @ApiPropertyOptional({ minimum: 3, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(100)
  limit?: number;
}

const CACHE_TTL_SECONDS = 300;

/**
 * Standings are materialised into `LeaderboardEntry` by a scheduled rebuild and
 * only read from there, so a public page never triggers a cross-table
 * aggregation. Only a display name, an illustrated avatar and two public scores
 * are ever stored — no email, age, date of birth or parent data.
 */
@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async get(period: LeaderboardPeriod, currentChildId: string | undefined, limit: number): Promise<LeaderboardDto> {
    const bucket = this.bucketFor(period);

    // Only fully serialised values are cached. Caching Prisma rows would round
    // Date fields through JSON and hand back strings on the next read.
    const cached = await this.cache.remember(
      CacheKeys.leaderboard(period, bucket),
      CACHE_TTL_SECONDS,
      async () => {
        let rows = await this.prisma.leaderboardEntry.findMany({
          where: { period, bucket },
          orderBy: { rank: "asc" },
          take: limit,
        });

        // An empty materialised table (fresh install, or before the first cron
        // run) rebuilds on demand rather than showing an empty board. Without
        // a worker process (QUEUE_DRIVER=off) the hourly cron never fires, so
        // staleness is also repaired here on the read path.
        const stale =
          rows.length > 0 &&
          queuesDisabled() &&
          Date.now() - rows[0].generatedAt.getTime() > 3_600_000;
        if (rows.length === 0 || stale) {
          await this.rebuild(period);
          rows = await this.prisma.leaderboardEntry.findMany({
            where: { period, bucket },
            orderBy: { rank: "asc" },
            take: limit,
          });
        }

        return {
          generatedAt: rows[0]?.generatedAt.toISOString() ?? new Date().toISOString(),
          entries: rows.map((row) => ({
            rank: row.rank,
            childId: row.childId,
            displayName: row.displayName,
            avatarGlyph: row.avatarGlyph,
            avatarTone: row.avatarTone,
            stars: row.stars,
            xp: row.xp,
          })),
        };
      },
    );

    const withHighlight = (entry: (typeof cached.entries)[number]): LeaderboardEntryDto => ({
      ...entry,
      isCurrentChild: entry.childId === currentChildId,
    });

    let currentChild: LeaderboardEntryDto | null = null;
    if (currentChildId) {
      const own = await this.prisma.leaderboardEntry.findUnique({
        where: { period_bucket_childId: { period, bucket, childId: currentChildId } },
      });
      currentChild = own
        ? {
            rank: own.rank,
            childId: own.childId,
            displayName: own.displayName,
            avatarGlyph: own.avatarGlyph,
            avatarTone: own.avatarTone,
            stars: own.stars,
            xp: own.xp,
            isCurrentChild: true,
          }
        : null;
    }

    return {
      period,
      generatedAt: cached.generatedAt,
      entries: cached.entries.map(withHighlight),
      currentChild,
    };
  }

  /**
   * Recomputes one period.
   *
   * Weekly and monthly boards score the window's daily buckets; all-time uses
   * the child's lifetime totals.
   */
  async rebuild(period: LeaderboardPeriod): Promise<number> {
    const bucket = this.bucketFor(period);
    const children = await this.prisma.child.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, avatarGlyph: true, avatarTone: true, progress: true },
    });
    if (children.length === 0) return 0;

    let scores: Array<{ childId: string; stars: number; xp: number }>;

    if (period === LeaderboardPeriod.ALL_TIME) {
      scores = children.map((child) => ({
        childId: child.id,
        stars: child.progress?.stars ?? 0,
        xp: child.progress?.xp ?? 0,
      }));
    } else {
      const from = period === LeaderboardPeriod.WEEKLY ? this.shiftDays(this.today(), -6) : this.shiftDays(this.today(), -29);
      const grouped = await this.prisma.dailyStat.groupBy({
        by: ["childId"],
        where: { dayKey: { gte: from }, childId: { in: children.map((c) => c.id) } },
        _sum: { starsEarned: true, xpEarned: true },
      });
      const byChild = new Map(grouped.map((row) => [row.childId, row._sum]));
      scores = children.map((child) => ({
        childId: child.id,
        stars: byChild.get(child.id)?.starsEarned ?? 0,
        xp: byChild.get(child.id)?.xpEarned ?? 0,
      }));
    }

    const ranked = scores
      .sort((a, b) => b.stars - a.stars || b.xp - a.xp)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const byId = new Map(children.map((child) => [child.id, child]));
    const generatedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.leaderboardEntry.deleteMany({ where: { period, bucket } }),
      this.prisma.leaderboardEntry.createMany({
        data: ranked.map((entry) => {
          const child = byId.get(entry.childId);
          return {
            period,
            bucket,
            childId: entry.childId,
            // First name only — the board is public to other families.
            displayName: (child?.name ?? "Learner").split(" ")[0],
            avatarGlyph: child?.avatarGlyph ?? "🧒",
            avatarTone: child?.avatarTone ?? "brand",
            stars: entry.stars,
            xp: entry.xp,
            rank: entry.rank,
            generatedAt,
          };
        }),
      }),
    ]);

    await this.cache.del(CacheKeys.leaderboard(period, bucket));
    return ranked.length;
  }

  /** Hourly rebuild keeps the board fresh without any request paying for it. */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledRebuild(): Promise<void> {
    for (const period of Object.values(LeaderboardPeriod)) {
      const count = await this.rebuild(period).catch((error: Error) => {
        this.logger.error(`Leaderboard rebuild failed for ${period}: ${error.message}`);
        return 0;
      });
      this.logger.debug(`Rebuilt ${period} leaderboard with ${count} entries`);
    }
  }

  private bucketFor(period: LeaderboardPeriod): string {
    const now = new Date();
    if (period === LeaderboardPeriod.ALL_TIME) return "ALL";
    if (period === LeaderboardPeriod.MONTHLY) {
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    return `${now.getUTCFullYear()}-W${String(this.isoWeek(now)).padStart(2, "0")}`;
  }

  private isoWeek(date: Date): number {
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNumber = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNumber + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const diff = target.getTime() - firstThursday.getTime();
    return 1 + Math.round(diff / (7 * 86_400_000));
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private shiftDays(dayKey: string, days: number): string {
    const date = new Date(`${dayKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
}

@ApiTags("Leaderboard")
@Controller("leaderboard")
export class LeaderboardController {
  constructor(
    private readonly leaderboard: LeaderboardService,
    private readonly access: ChildAccessService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Public standings",
    description:
      "Served from a materialised table refreshed hourly. Only a first name, an illustrated avatar and public scores are exposed.",
  })
  @ApiQuery({ name: "period", required: false, enum: LeaderboardPeriod })
  async get(@CurrentUser() user: RequestUser, @Query() query: LeaderboardQueryDto) {
    if (query.childId) await this.access.assertAccess(user, query.childId);
    return this.leaderboard.get(query.period ?? LeaderboardPeriod.WEEKLY, query.childId, query.limit ?? 20);
  }
}

@Global()
@Module({
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
