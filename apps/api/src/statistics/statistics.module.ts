import { Controller, Get, Global, Module, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ApiEnvelopeResponse, CurrentUser, type RequestUser } from "../common/decorators";
import { ChildAccessService } from "../children/child-access.service";
import { StatisticsService } from "./statistics.service";
import { StatisticsQueryDto, StatisticsSummaryResponse } from "./dto/statistics.dto";

@ApiTags("Statistics")
@Controller("children/:childId/statistics")
export class StatisticsController {
  constructor(
    private readonly statistics: StatisticsService,
    private readonly access: ChildAccessService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Windowed learning analytics for one child",
    description:
      "Reads pre-aggregated daily buckets, so the cost does not grow with a child's history. Returns chart-ready series with one point per day, including days with no activity.",
  })
  @ApiParam({ name: "childId", format: "uuid" })
  @ApiEnvelopeResponse(StatisticsSummaryResponse)
  async summary(
    @CurrentUser() user: RequestUser,
    @Param("childId") childId: string,
    @Query() query: StatisticsQueryDto,
  ) {
    await this.access.assertAccess(user, childId);
    return this.statistics.summary(childId, query, user.locale);
  }

  @Get("subject-strength")
  @ApiOperation({ summary: "Accuracy per subject, strongest first" })
  @ApiParam({ name: "childId", format: "uuid" })
  async subjectStrength(@CurrentUser() user: RequestUser, @Param("childId") childId: string) {
    await this.access.assertAccess(user, childId);
    return this.statistics.subjectStrength(childId, user.locale);
  }

  @Get("weak-topics")
  @ApiOperation({
    summary: "Subjects that need practice",
    description: "Subjects with enough answers to judge, weakest first. Feeds the recommendation engine.",
  })
  @ApiParam({ name: "childId", format: "uuid" })
  async weakTopics(@CurrentUser() user: RequestUser, @Param("childId") childId: string) {
    await this.access.assertAccess(user, childId);
    return this.statistics.weakSubjects(childId, user.locale);
  }
}

@Global()
@Module({
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
