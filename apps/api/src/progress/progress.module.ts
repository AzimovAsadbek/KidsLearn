import { Body, Controller, Get, Global, Module, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import type { Locale } from "@kidslearn/types";
import { CurrentUser, type RequestUser } from "../common/decorators";
import { PaginationQueryDto, paginationMeta } from "../common/dto/pagination.dto";
import { withMeta } from "../common/http/response.interceptor";
import { ChildAccessService } from "../children/child-access.service";
import { ProgressService } from "./progress.service";
import { AchievementsService, RewardsService } from "./achievements.service";

export class ClaimRewardDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  rewardId!: string;
}

@ApiTags("Progress")
@Controller("children/:childId")
export class ProgressController {
  constructor(
    private readonly progress: ProgressService,
    private readonly achievements: AchievementsService,
    private readonly rewards: RewardsService,
    private readonly access: ChildAccessService,
  ) {}

  @Get("progress")
  @ApiOperation({ summary: "Aggregated progress for one child" })
  @ApiParam({ name: "childId", format: "uuid" })
  async childProgress(@CurrentUser() user: RequestUser, @Param("childId") childId: string) {
    await this.access.assertAccess(user, childId);
    return this.progress.forChild(childId);
  }

  @Get("activity")
  @ApiOperation({ summary: "Recent activity feed" })
  @ApiParam({ name: "childId", format: "uuid" })
  async activity(
    @CurrentUser() user: RequestUser,
    @Param("childId") childId: string,
    @Query() query: PaginationQueryDto,
  ) {
    await this.access.assertAccess(user, childId);
    const { items, total } = await this.progress.activityFeed(childId, query.skip, query.limit);
    return withMeta(items, paginationMeta(total, query.page, query.limit));
  }

  @Get("achievements")
  @ApiOperation({ summary: "Achievements with per-child progress" })
  @ApiParam({ name: "childId", format: "uuid" })
  async childAchievements(@CurrentUser() user: RequestUser, @Param("childId") childId: string) {
    await this.access.assertAccess(user, childId);
    return this.achievements.listForChild(childId, user.locale as Locale);
  }

  @Get("rewards")
  @ApiOperation({ summary: "Reward store with claim state" })
  @ApiParam({ name: "childId", format: "uuid" })
  async childRewards(@CurrentUser() user: RequestUser, @Param("childId") childId: string) {
    await this.access.assertAccess(user, childId);
    return this.rewards.listForChild(childId, user.locale as Locale);
  }

  @Post("rewards/claim")
  @ApiOperation({
    summary: "Spend stars on a reward",
    description: "The balance check and deduction share a transaction, so a reward can't be claimed twice.",
  })
  @ApiParam({ name: "childId", format: "uuid" })
  async claim(
    @CurrentUser() user: RequestUser,
    @Param("childId") childId: string,
    @Body() dto: ClaimRewardDto,
  ) {
    await this.access.assertAccess(user, childId);
    return this.rewards.claim(childId, dto.rewardId);
  }
}

@Global()
@Module({
  controllers: [ProgressController],
  providers: [ProgressService, AchievementsService, RewardsService],
  exports: [ProgressService, AchievementsService, RewardsService],
})
export class ProgressModule {}
