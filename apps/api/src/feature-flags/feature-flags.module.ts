import { Body, Controller, Get, Global, Injectable, Module, Param, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { FeatureFlagKey, type FeatureFlagsDto } from "@kidslearn/types";
import { PrismaService } from "../common/prisma/prisma.service";
import { CacheKeys, CacheService } from "../common/redis/redis.service";
import { ClientIp, CurrentUser, Public, Roles, type RequestUser } from "../common/decorators";
import { AuditActions, AuditService } from "../audit/audit.module";

export class UpdateFeatureFlagDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}

const DEFAULTS: Record<string, boolean> = {
  AI_RECOMMENDATIONS: true,
  AI_IMAGE_GENERATION: true,
  VOICE_CONTROL: true,
  PWA: true,
  LEADERBOARD: true,
  PUSH_NOTIFICATIONS: true,
  CERTIFICATES: true,
  OFFLINE_LESSONS: true,
};

/**
 * Flags are read on nearly every page load, so they are cached aggressively and
 * invalidated on write. A missing row falls back to the compiled-in default,
 * which keeps a fresh database usable before the seed runs.
 */
@Injectable()
export class FeatureFlagsService {
  private static readonly TTL_SECONDS = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async all(): Promise<FeatureFlagsDto> {
    return this.cache.remember(CacheKeys.featureFlags(), FeatureFlagsService.TTL_SECONDS, async () => {
      const rows = await this.prisma.featureFlag.findMany();
      const stored = Object.fromEntries(rows.map((row) => [row.key, row.enabled]));
      return Object.fromEntries(
        Object.keys(FeatureFlagKey).map((key) => [key, stored[key] ?? DEFAULTS[key] ?? false]),
      ) as FeatureFlagsDto;
    });
  }

  async isEnabled(key: FeatureFlagKey): Promise<boolean> {
    const flags = await this.all();
    return flags[key] ?? false;
  }

  async set(key: string, enabled: boolean): Promise<FeatureFlagsDto> {
    await this.prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled },
      update: { enabled },
    });
    await this.cache.del(CacheKeys.featureFlags());
    return this.all();
  }
}

@ApiTags("Platform")
@Controller("feature-flags")
export class FeatureFlagsController {
  constructor(
    private readonly flags: FeatureFlagsService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "Current feature flags",
    description: "Public so the web app can configure itself before a session exists.",
  })
  async list(): Promise<FeatureFlagsDto> {
    return this.flags.all();
  }

  @Roles("ADMIN")
  @Patch(":key")
  @ApiOperation({ summary: "Enable or disable a feature" })
  async update(
    @Param("key") key: string,
    @Body() dto: UpdateFeatureFlagDto,
    @CurrentUser() user: RequestUser,
    @ClientIp() ip: string | null,
  ): Promise<FeatureFlagsDto> {
    const result = await this.flags.set(key, dto.enabled);
    this.audit.record({
      userId: user.id,
      action: AuditActions.FEATURE_FLAG_CHANGED,
      resource: "feature_flag",
      resourceId: key,
      metadata: { enabled: dto.enabled },
      ip,
    });
    return result;
  }
}

@Global()
@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
