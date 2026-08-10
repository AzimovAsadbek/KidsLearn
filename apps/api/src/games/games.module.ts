import { Body, Controller, Get, Module, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ApiEnvelopeResponse, ApiPaginatedResponse, CurrentUser, type RequestUser } from "../common/decorators";
import { paginationMeta } from "../common/dto/pagination.dto";
import { withMeta } from "../common/http/response.interceptor";
import { GamesService } from "./games.service";
import {
  GameAttemptResultResponse,
  GameQueryDto,
  GameResponse,
  GameSessionResponse,
  StartSessionDto,
  SubmitAttemptDto,
} from "./dto/game.dto";

@ApiTags("Games")
@Controller("games")
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  @ApiOperation({
    summary: "List games",
    description: "Non-admins receive PUBLISHED games only. `childId` restricts results to that child's age band.",
  })
  @ApiPaginatedResponse(GameResponse)
  async list(@CurrentUser() user: RequestUser, @Query() query: GameQueryDto) {
    const { items, total } = await this.games.list(user, query);
    return withMeta(items, paginationMeta(total, query.page, query.limit));
  }

  @Get(":idOrSlug")
  @ApiOperation({ summary: "Fetch one game" })
  @ApiParam({ name: "idOrSlug" })
  @ApiEnvelopeResponse(GameResponse)
  async findOne(@CurrentUser() user: RequestUser, @Param("idOrSlug") idOrSlug: string) {
    return this.games.findOne(user, idOrSlug);
  }

  @Post(":idOrSlug/sessions")
  @ApiOperation({
    summary: "Deal a game session",
    description:
      "Returns the rounds to play, without answer keys. The dealt questions are stored so the attempt can be graded server-side.",
  })
  @ApiParam({ name: "idOrSlug" })
  @ApiEnvelopeResponse(GameSessionResponse, "A playable session")
  async startSession(
    @CurrentUser() user: RequestUser,
    @Param("idOrSlug") idOrSlug: string,
    @Body() dto: StartSessionDto,
  ) {
    return this.games.startSession(user, idOrSlug, dto);
  }

  @Post("attempts")
  @ApiOperation({
    summary: "Submit a completed game",
    description:
      "The server grades the answers, awards stars and XP, updates progress, evaluates achievements and returns the new totals. Idempotent on `clientAttemptId`.",
  })
  @ApiEnvelopeResponse(GameAttemptResultResponse, "Graded result and updated progress")
  async submitAttempt(@CurrentUser() user: RequestUser, @Body() dto: SubmitAttemptDto) {
    return this.games.submitAttempt(user, dto);
  }
}

@Module({
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
