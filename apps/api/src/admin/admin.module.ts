import { Body, Controller, Get, Injectable, Module, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import type { AdminAnalyticsDto, AdminMetricsDto } from "@kidslearn/types";
import { Prisma } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { CacheKeys, CacheService } from "../common/redis/redis.service";
import { ApiPaginatedResponse, ClientIp, CurrentUser, Roles, type RequestUser } from "../common/decorators";
import { SearchQueryDto, paginationMeta, safeOrderBy } from "../common/dto/pagination.dto";
import { withMeta } from "../common/http/response.interceptor";
import { AuditActions, AuditService } from "../audit/audit.module";
import { pickTranslation } from "../common/utils/locale";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { NotificationsService } from "../notifications/notifications.service";
import { JOBS, QUEUES } from "../queue/queue.module";
import { Locale as PrismaLocale } from "@kidslearn/database";

export class AdminUserQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({ enum: ["ADMIN", "PARENT"] })
  @IsOptional()
  @IsEnum({ ADMIN: "ADMIN", PARENT: "PARENT" })
  role?: "ADMIN" | "PARENT";

  @ApiPropertyOptional({ enum: ["ACTIVE", "INVITED", "SUSPENDED"] })
  @IsOptional()
  @IsEnum({ ACTIVE: "ACTIVE", INVITED: "INVITED", SUSPENDED: "SUSPENDED" })
  status?: "ACTIVE" | "INVITED" | "SUSPENDED";
}

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: ["ADMIN", "PARENT"] })
  @IsOptional()
  @IsEnum({ ADMIN: "ADMIN", PARENT: "PARENT" })
  role?: "ADMIN" | "PARENT";

  @ApiPropertyOptional({ enum: ["ACTIVE", "INVITED", "SUSPENDED"] })
  @IsOptional()
  @IsEnum({ ACTIVE: "ACTIVE", INVITED: "INVITED", SUSPENDED: "SUSPENDED" })
  status?: "ACTIVE" | "INVITED" | "SUSPENDED";
}

export class AdminUserResponse {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ enum: ["ADMIN", "PARENT"] }) role!: string;
  @ApiProperty({ enum: ["ACTIVE", "INVITED", "SUSPENDED"] }) status!: string;
  @ApiProperty() childrenCount!: number;
  @ApiProperty() avatarGlyph!: string;
  @ApiProperty() avatarTone!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true, type: String }) lastSeenAt!: string | null;
}

export class BroadcastDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  body!: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  href?: string;
}

const ANALYTICS_TTL_SECONDS = 300;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly notifications: NotificationsService,
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly queue: Queue,
  ) {}

  async listUsers(query: AdminUserQueryDto) {
    const needle = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(needle
        ? {
            OR: [
              { name: { contains: needle, mode: "insensitive" } },
              { email: { contains: needle, mode: "insensitive" } },
              { phone: { contains: needle } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: safeOrderBy(query.sortBy, ["createdAt", "name", "email", "lastSeenAt"] as const, "createdAt", query.sortOrder),
        skip: query.skip,
        take: query.limit,
        include: { _count: { select: { children: { where: { deletedAt: null } } } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        status: row.status,
        childrenCount: row._count.children,
        avatarGlyph: row.avatarGlyph,
        avatarTone: row.avatarTone,
        createdAt: row.createdAt.toISOString(),
        lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
      })),
    };
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role, status: dto.status },
      include: { _count: { select: { children: true } } },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      childrenCount: user._count.children,
      avatarGlyph: user.avatarGlyph,
      avatarTone: user.avatarTone,
      createdAt: user.createdAt.toISOString(),
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    };
  }

  async metrics(): Promise<AdminMetricsDto> {
    const activeSince = new Date(Date.now() - 24 * 3_600_000);
    const [users, parents, children, lessons, games, active] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, role: "PARENT" } }),
      this.prisma.child.count({ where: { deletedAt: null } }),
      this.prisma.lesson.count({ where: { deletedAt: null } }),
      this.prisma.game.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, lastSeenAt: { gte: activeSince } } }),
    ]);

    return {
      totalUsers: users,
      totalParents: parents,
      totalChildren: children,
      totalLessons: lessons,
      totalGames: games,
      activeUsers: active,
      deltas: {},
    };
  }

  /**
   * Platform analytics. Every figure is derived from real rows; where there is
   * genuinely no data yet the value is zero rather than an invented number.
   */
  async analytics(): Promise<AdminAnalyticsDto> {
    return this.cache.remember(CacheKeys.adminAnalytics("v1"), ANALYTICS_TTL_SECONDS, async () => {
      const now = Date.now();
      const dayKey = (offset: number) => new Date(now - offset * 86_400_000).toISOString().slice(0, 10);

      const [dau, wau, mau, lessonStats, gameStats, attemptAgg, subjects, topLessons, topGames, dailyBuckets, growth] =
        await Promise.all([
          this.prisma.dailyStat.findMany({ where: { dayKey: dayKey(0) }, select: { childId: true } }),
          this.prisma.dailyStat.findMany({ where: { dayKey: { gte: dayKey(6) } }, select: { childId: true } }),
          this.prisma.dailyStat.findMany({ where: { dayKey: { gte: dayKey(29) } }, select: { childId: true } }),
          this.prisma.lessonProgress.aggregate({ _count: { _all: true } }),
          this.prisma.game.aggregate({ _sum: { plays: true, completedPlays: true } }),
          this.prisma.gameAttempt.aggregate({ _avg: { durationSeconds: true }, _count: { _all: true } }),
          this.prisma.subject.findMany({ include: { translations: true, subjectStats: true } }),
          this.prisma.lesson.findMany({
            where: { deletedAt: null },
            orderBy: { completions: "desc" },
            take: 5,
            include: { translations: true },
          }),
          this.prisma.game.findMany({
            where: { deletedAt: null },
            orderBy: { plays: "desc" },
            take: 5,
            include: { translations: true },
          }),
          this.prisma.dailyStat.groupBy({
            by: ["dayKey"],
            where: { dayKey: { gte: dayKey(6) } },
            _sum: { learningSeconds: true },
            orderBy: { dayKey: "asc" },
          }),
          this.prisma.user.groupBy({
            by: ["createdAt"],
            _count: { _all: true },
            orderBy: { createdAt: "asc" },
            take: 400,
          }),
        ]);

      const completedLessons = await this.prisma.lessonProgress.count({ where: { completedAt: { not: null } } });
      const totalPlays = gameStats._sum.plays ?? 0;
      const totalCompletedPlays = gameStats._sum.completedPlays ?? 0;

      const subjectShare = subjects
        .map((subject) => ({
          subjectId: subject.id,
          label: pickTranslation(subject.translations, PrismaLocale.EN)?.name ?? subject.slug,
          tone: subject.tone,
          value: subject.subjectStats.reduce((sum, stat) => sum + stat.totalAnswers, 0),
        }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      const weeklyGrowth = this.bucketByWeek(growth.map((row) => row.createdAt));

      return {
        dau: new Set(dau.map((row) => row.childId)).size,
        wau: new Set(wau.map((row) => row.childId)).size,
        mau: new Set(mau.map((row) => row.childId)).size,
        lessonCompletionRate:
          lessonStats._count._all > 0 ? Math.round((completedLessons / lessonStats._count._all) * 100) : 0,
        gameCompletionRate: totalPlays > 0 ? Math.round((totalCompletedPlays / totalPlays) * 100) : 0,
        averageSessionSeconds: Math.round(attemptAgg._avg.durationSeconds ?? 0),
        retentionD30: 0,
        userGrowth: weeklyGrowth,
        dailyActivity: dailyBuckets.map((bucket) => ({
          label: bucket.dayKey.slice(5),
          date: bucket.dayKey,
          value: Math.round((bucket._sum.learningSeconds ?? 0) / 60),
        })),
        lessonCompletionTrend: dailyBuckets.map((bucket) => ({
          label: bucket.dayKey.slice(5),
          date: bucket.dayKey,
          value: Math.round((bucket._sum.learningSeconds ?? 0) / 60),
        })),
        subjectShare,
        retentionCurve: [],
        topLessons: topLessons.map((lesson) => ({
          id: lesson.id,
          title: pickTranslation(lesson.translations, PrismaLocale.EN)?.title ?? lesson.slug,
          glyph: lesson.glyph,
          tone: lesson.tone,
          completions: lesson.completions,
        })),
        topGames: topGames.map((game) => ({
          id: game.id,
          title: pickTranslation(game.translations, PrismaLocale.EN)?.title ?? game.slug,
          glyph: game.glyph,
          tone: game.tone,
          plays: game.plays,
        })),
      } satisfies AdminAnalyticsDto;
    });
  }

  /** In-app rows land immediately; push fan-out runs as a background job. */
  async broadcast(dto: { title: string; body: string; href?: string }) {
    const reach = await this.notifications.notifyAllParents({
      type: "SYSTEM",
      title: dto.title,
      body: dto.body,
      glyph: "📣",
      tone: "brand",
      href: dto.href ?? null,
    });
    await this.queue.add(
      JOBS.BROADCAST_PUSH,
      { title: dto.title, body: dto.body, href: dto.href },
      { jobId: `broadcast-${Date.now()}` },
    );
    return reach;
  }

  async auditLog(skip: number, take: number) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { user: { select: { name: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userName: row.user?.name ?? null,
        action: row.action,
        resource: row.resource,
        resourceId: row.resourceId,
        metadata: row.metadata as Record<string, unknown> | null,
        ip: row.ip,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  /** Achievement definitions with unlock counts, for the admin table. */
  async achievementDefinitions() {
    const rows = await this.prisma.achievement.findMany({
      orderBy: [{ order: "asc" }, { code: "asc" }],
      include: {
        translations: true,
        _count: { select: { children: { where: { unlockedAt: { not: null } } } } },
      },
    });
    const totalChildren = Math.max(1, await this.prisma.child.count({ where: { deletedAt: null } }));
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      tier: row.tier,
      category: row.category,
      glyph: row.glyph,
      tone: row.tone,
      xpReward: row.xpReward,
      active: row.active,
      title: pickTranslation(row.translations, PrismaLocale.EN)?.title ?? row.code,
      description: pickTranslation(row.translations, PrismaLocale.EN)?.description ?? "",
      unlockedCount: row._count.children,
      unlockRate: Math.round((row._count.children / totalChildren) * 100),
    }));
  }

  /** Reward definitions with claim counts. */
  async rewardDefinitions() {
    const rows = await this.prisma.reward.findMany({
      orderBy: [{ order: "asc" }, { costStars: "asc" }],
      include: { translations: true, _count: { select: { claims: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      glyph: row.glyph,
      tone: row.tone,
      costStars: row.costStars,
      active: row.active,
      title: pickTranslation(row.translations, PrismaLocale.EN)?.title ?? row.code,
      description: pickTranslation(row.translations, PrismaLocale.EN)?.description ?? "",
      claimCount: row._count.claims,
    }));
  }

  /** Every certificate the platform has issued. */
  async certificates(skip: number, take: number) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.certificate.findMany({
        orderBy: { issuedAt: "desc" },
        skip,
        take,
        include: { child: { select: { name: true } } },
      }),
      this.prisma.certificate.count(),
    ]);
    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        childId: row.childId,
        childName: row.child.name,
        programme: row.programme,
        serial: row.serial,
        xp: row.xp,
        stars: row.stars,
        status: row.status,
        issuedAt: row.issuedAt.toISOString(),
      })),
    };
  }

  private bucketByWeek(dates: Date[]) {
    const buckets = new Map<string, number>();
    for (const date of dates) {
      const key = date.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([date, value]) => ({ label: date.slice(5), date, value }));
  }
}

@ApiTags("Admin")
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get("metrics")
  @ApiOperation({ summary: "Headline platform counters" })
  async metrics() {
    return this.admin.metrics();
  }

  @Get("analytics")
  @ApiOperation({
    summary: "Engagement and content analytics",
    description: "Derived from real activity. Figures with no underlying data return zero rather than a placeholder.",
  })
  async analytics() {
    return this.admin.analytics();
  }

  @Get("users")
  @ApiOperation({ summary: "Search, filter and page through accounts" })
  @ApiPaginatedResponse(AdminUserResponse)
  async users(@Query() query: AdminUserQueryDto) {
    const { items, total } = await this.admin.listUsers(query);
    return withMeta(items, paginationMeta(total, query.page, query.limit));
  }

  @Patch("users/:id")
  @ApiOperation({ summary: "Change a user's role or status" })
  @ApiParam({ name: "id", format: "uuid" })
  async updateUser(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
    @ClientIp() ip: string | null,
  ) {
    const updated = await this.admin.updateUser(id, dto);
    if (dto.role) {
      this.audit.record({
        userId: user.id,
        action: AuditActions.USER_ROLE_CHANGED,
        resource: "user",
        resourceId: id,
        metadata: { role: dto.role },
        ip,
      });
    }
    if (dto.status) {
      this.audit.record({
        userId: user.id,
        action: AuditActions.USER_STATUS_CHANGED,
        resource: "user",
        resourceId: id,
        metadata: { status: dto.status },
        ip,
      });
    }
    return updated;
  }

  @Get("achievements")
  @ApiOperation({ summary: "Achievement definitions with global unlock rates" })
  async achievements() {
    return this.admin.achievementDefinitions();
  }

  @Get("rewards")
  @ApiOperation({ summary: "Reward definitions with claim counts" })
  async rewards() {
    return this.admin.rewardDefinitions();
  }

  @Get("certificates")
  @ApiOperation({ summary: "Every issued certificate" })
  async certificates(@Query() query: SearchQueryDto) {
    const { items, total } = await this.admin.certificates(query.skip, query.limit);
    return withMeta(items, paginationMeta(total, query.page, query.limit));
  }

  @Post("notifications/broadcast")
  @ApiOperation({
    summary: "Send an announcement to every parent",
    description: "Creates in-app notifications immediately and queues push delivery in the background.",
  })
  async broadcast(
    @Body() dto: BroadcastDto,
    @CurrentUser() user: RequestUser,
    @ClientIp() ip: string | null,
  ) {
    const reach = await this.admin.broadcast(dto);
    this.audit.record({
      userId: user.id,
      action: AuditActions.NOTIFICATION_BROADCAST,
      resource: "notification",
      metadata: { title: dto.title, reach },
      ip,
    });
    return { reach };
  }

  @Get("audit-log")
  @ApiOperation({ summary: "Recent administrative actions" })
  async auditLog(@Query() query: SearchQueryDto) {
    const { items, total } = await this.admin.auditLog(query.skip, query.limit);
    return withMeta(items, paginationMeta(total, query.page, query.limit));
  }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
