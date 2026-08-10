import { Body, Controller, Get, Module, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import {
  ApiEnvelopeResponse,
  ApiPaginatedResponse,
  ClientIp,
  CurrentUser,
  Public,
  Roles,
  type RequestUser,
} from "../common/decorators";
import { paginationMeta } from "../common/dto/pagination.dto";
import { withMeta } from "../common/http/response.interceptor";
import { AuditActions, AuditService } from "../audit/audit.module";
import { ChildAccessService } from "../children/child-access.service";
import { AiService } from "./ai.service";
import { AiProviderFactory } from "./providers";
import {
  AiJobQueryDto,
  AiJobResponse,
  AiProviderStatusResponse,
  GenerateImageDto,
  RecommendationResponse,
  ReviewAiJobDto,
} from "./dto/ai.dto";

@ApiTags("AI")
@Controller("ai")
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly audit: AuditService,
    private readonly access: ChildAccessService,
  ) {}

  @Public()
  @Get("status")
  @ApiOperation({
    summary: "Which AI capabilities are actually configured",
    description:
      "The admin UI renders this verbatim. When no image model is configured the generator reports `preview` mode and produces a labelled placeholder rather than pretending to have called a model.",
  })
  @ApiEnvelopeResponse(AiProviderStatusResponse)
  status() {
    return this.ai.status();
  }

  @Roles("ADMIN")
  @Post("images")
  @ApiOperation({
    summary: "Generate an educational illustration",
    description:
      "Creates an AI job, stores the result in the media library with status REVIEW, and returns the job. Nothing reaches a child before an editor approves it.",
  })
  @ApiEnvelopeResponse(AiJobResponse)
  async generateImage(
    @Body() dto: GenerateImageDto,
    @CurrentUser() user: RequestUser,
    @ClientIp() ip: string | null,
  ) {
    const job = await this.ai.generateImage(dto, user.id);
    this.audit.record({
      userId: user.id,
      action: AuditActions.AI_GENERATION_REQUESTED,
      resource: "ai_job",
      resourceId: job.id,
      metadata: { prompt: dto.prompt, provider: job.provider, status: job.status },
      ip,
    });
    return job;
  }

  @Roles("ADMIN")
  @Get("jobs")
  @ApiOperation({ summary: "Generation history and review queue" })
  @ApiPaginatedResponse(AiJobResponse)
  async listJobs(@Query() query: AiJobQueryDto) {
    const { items, total } = await this.ai.listJobs({
      skip: query.skip,
      take: query.limit,
      status: query.status,
    });
    return withMeta(items, paginationMeta(total, query.page, query.limit));
  }

  @Roles("ADMIN")
  @Post("jobs/:id/review")
  @ApiOperation({ summary: "Approve or reject generated content" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiEnvelopeResponse(AiJobResponse)
  async review(
    @Param("id") id: string,
    @Body() dto: ReviewAiJobDto,
    @CurrentUser() user: RequestUser,
    @ClientIp() ip: string | null,
  ) {
    const job = await this.ai.review(id, dto.approve, user.id, dto.note);
    this.audit.record({
      userId: user.id,
      action: AuditActions.AI_CONTENT_REVIEWED,
      resource: "ai_job",
      resourceId: id,
      metadata: { approved: dto.approve, note: dto.note },
      ip,
    });
    return job;
  }
}

@ApiTags("AI")
@Controller("children/:childId/recommendation")
export class RecommendationsController {
  constructor(
    private readonly ai: AiService,
    private readonly access: ChildAccessService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Current learning recommendation",
    description:
      "Served from a cached row and only regenerated once it expires, so rendering a dashboard never triggers a provider call. Falls back to the rule-based engine whenever no AI provider is configured.",
  })
  @ApiParam({ name: "childId", format: "uuid" })
  @ApiEnvelopeResponse(RecommendationResponse)
  async get(@CurrentUser() user: RequestUser, @Param("childId") childId: string) {
    await this.access.assertAccess(user, childId);
    return this.ai.recommendationFor(childId, user.locale);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Force a new recommendation" })
  @ApiParam({ name: "childId", format: "uuid" })
  @ApiEnvelopeResponse(RecommendationResponse)
  async refresh(@CurrentUser() user: RequestUser, @Param("childId") childId: string) {
    await this.access.assertAccess(user, childId);
    return this.ai.generateRecommendation(childId, user.locale);
  }
}

@Module({
  controllers: [AiController, RecommendationsController],
  providers: [AiService, AiProviderFactory],
  exports: [AiService, AiProviderFactory],
})
export class AiModule {}
