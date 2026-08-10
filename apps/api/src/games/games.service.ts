import { Injectable } from "@nestjs/common";
import {
  ActivityType,
  ErrorCode,
  GameType,
  accessibleAgeCategories,
  accuracyPercent,
  ageCategoryForDateOfBirth,
  starsForAccuracy,
  xpForGameAttempt,
  type GameAttemptResultDto,
  type GameBoardDto,
  type GameDto,
  type GameRoundDto,
  type GameSessionDto,
  type Locale,
} from "@kidslearn/types";
import { Prisma, type Locale as PrismaLocale } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { AppException } from "../common/errors/app-exception";
import { pickTranslation, toPrismaLocale } from "../common/utils/locale";
import { ChildAccessService } from "../children/child-access.service";
import { ProgressService } from "../progress/progress.service";
import type { RequestUser } from "../common/decorators";
import type { GameQueryDto, StartSessionDto, SubmitAttemptDto } from "./dto/game.dto";
import { seededShuffle } from "./deterministic";

const gameInclude = {
  translations: true,
  subject: { include: { translations: true } },
} satisfies Prisma.GameInclude;

type GameRow = Prisma.GameGetPayload<{ include: typeof gameInclude }>;

/** Sessions are short-lived; an abandoned one should not stay redeemable. */
const SESSION_TTL_MINUTES = 60;

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly childAccess: ChildAccessService,
    private readonly progress: ProgressService,
  ) {}

  async list(user: RequestUser, query: GameQueryDto): Promise<{ items: GameDto[]; total: number }> {
    const isAdmin = user.role === "ADMIN";
    const prismaLocale = toPrismaLocale(user.locale);

    let ageCategories: string[] | undefined;
    if (query.childId) {
      const child = await this.childAccess.assertAccess(user, query.childId);
      ageCategories = accessibleAgeCategories(ageCategoryForDateOfBirth(child.dateOfBirth));
    } else if (query.ageCategory) {
      ageCategories = [query.ageCategory];
    }

    const where: Prisma.GameWhereInput = {
      deletedAt: null,
      status: isAdmin ? (query.status ?? undefined) : "PUBLISHED",
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(ageCategories ? { ageCategory: { in: ageCategories as Prisma.EnumAgeCategoryFilter["in"] } } : {}),
      ...(query.search
        ? { translations: { some: { title: { contains: query.search, mode: "insensitive" } } } }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where,
        orderBy: query.sortBy === "plays" ? { plays: query.sortOrder } : { updatedAt: query.sortOrder },
        skip: query.skip,
        take: query.limit,
        include: gameInclude,
      }),
      this.prisma.game.count({ where }),
    ]);

    return { total, items: rows.map((row) => this.toDto(row, prismaLocale)) };
  }

  async findOne(user: RequestUser, idOrSlug: string): Promise<GameDto> {
    const game = await this.prisma.game.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        ...(user.role === "ADMIN" ? {} : { status: "PUBLISHED" }),
      },
      include: gameInclude,
    });
    if (!game) throw AppException.notFound("We couldn't find that game.", ErrorCode.GAME_NOT_FOUND);
    return this.toDto(game, toPrismaLocale(user.locale));
  }

  /**
   * Deals a session.
   *
   * The chosen questions are recorded server-side so the attempt can be graded
   * against what was actually asked. Answers are never included in the payload:
   * the client only learns whether it was right when it submits.
   */
  async startSession(user: RequestUser, gameIdOrSlug: string, dto: StartSessionDto): Promise<GameSessionDto> {
    const child = await this.childAccess.assertAccess(user, dto.childId);
    const game = await this.prisma.game.findFirst({
      where: {
        deletedAt: null,
        status: "PUBLISHED",
        OR: [{ id: gameIdOrSlug }, { slug: gameIdOrSlug }],
      },
      include: { ...gameInclude, questions: { include: { translations: true, options: { include: { translations: true } } } } },
    });

    if (!game) throw AppException.notFound("We couldn't find that game.", ErrorCode.GAME_NOT_FOUND);

    const allowedBands = accessibleAgeCategories(ageCategoryForDateOfBirth(child.dateOfBirth));
    if (!allowedBands.includes(game.ageCategory)) {
      throw AppException.forbidden("This game isn't available for this age group yet.");
    }

    const prismaLocale = toPrismaLocale(child.locale.toLowerCase() as Locale);
    const seed = dto.seed ?? Math.floor(Math.random() * 1_000_000);
    const isBoardGame = game.type === GameType.MEMORY || game.type === GameType.PUZZLE;

    // Walking a shuffled pool (rather than resampling each round) is what
    // guarantees a game never asks for the same answer twice in a row.
    const pool = seededShuffle(game.questions, seed);
    const dealt = isBoardGame ? [] : pool.slice(0, Math.min(game.roundsPerSession, pool.length));

    if (!isBoardGame && dealt.length === 0) {
      throw AppException.unprocessable("This game has no questions yet.");
    }

    const session = await this.prisma.gameSession.create({
      data: {
        gameId: game.id,
        childId: child.id,
        seed,
        questionIds: dealt.map((q) => q.id),
        expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60_000),
      },
    });

    const rounds: GameRoundDto[] = dealt.map((question, index) => {
      const options = seededShuffle(question.options, seed + index * 977);
      return {
        id: `r${index}`,
        questionId: question.id,
        prompt: pickTranslation(question.translations, prismaLocale)?.prompt ?? question.key,
        promptGlyph: question.promptGlyph,
        promptTone: question.promptTone,
        options: options.map((option) => ({
          id: option.id,
          label: pickTranslation(option.translations, prismaLocale)?.label ?? option.key,
          glyph: option.glyph,
          tone: option.tone,
        })),
      };
    });

    return {
      sessionId: session.id,
      game: this.toDto(game, prismaLocale),
      rounds,
      board: isBoardGame ? this.buildBoard(game.type, game.boardConfig, seed) : null,
    };
  }

  /**
   * Grades and records an attempt.
   *
   * `clientAttemptId` is a unique column, so a retry, a double-tap or an
   * offline replay all resolve to the same stored attempt instead of awarding
   * XP twice.
   */
  async submitAttempt(user: RequestUser, dto: SubmitAttemptDto): Promise<GameAttemptResultDto> {
    await this.childAccess.assertAccess(user, dto.childId);

    const existing = await this.prisma.gameAttempt.findUnique({
      where: { clientAttemptId: dto.clientAttemptId },
      include: { game: true },
    });
    if (existing) {
      // Idempotent replay: report the original outcome, award nothing further.
      return {
        attemptId: existing.id,
        score: existing.score,
        total: existing.totalQuestions,
        correctAnswers: existing.correctAnswers,
        wrongAnswers: existing.wrongAnswers,
        accuracy: existing.accuracy,
        durationSeconds: existing.durationSeconds,
        starsAwarded: existing.starsAwarded,
        xpAwarded: existing.xpAwarded,
        unlockedAchievements: [],
        progress: await this.progress.forChild(dto.childId),
      };
    }

    const session = await this.prisma.gameSession.findFirst({
      where: { id: dto.sessionId, childId: dto.childId },
      include: { game: true },
    });
    if (!session) throw AppException.notFound("That game session has expired. Start the game again.");
    if (session.consumedAt) throw AppException.conflict("That session has already been submitted.");
    if (session.expiresAt.getTime() < Date.now()) {
      throw AppException.unprocessable("That game session has expired. Start the game again.");
    }

    const game = session.game;
    const isBoardGame = game.type === GameType.MEMORY || game.type === GameType.PUZZLE;

    let correct = 0;
    let total = 0;
    const answerRows: Array<{ questionId: string; selectedOptionKey: string | null; correct: boolean; timeMs?: number }> = [];

    if (isBoardGame) {
      // Board games report their own completion; the score is the number of
      // pieces or pairs the child actually resolved.
      const board = dto.boardResult;
      total = game.type === GameType.MEMORY ? (board?.matchedPairs ?? 0) : 9;
      correct = game.type === GameType.MEMORY ? (board?.matchedPairs ?? 0) : (board?.placedPieces ?? 0);
      total = Math.max(total, correct);
    } else {
      // Grade against the questions this session actually dealt — a client
      // cannot submit answers for questions it was never asked.
      const dealtIds = new Set(session.questionIds);
      const submitted = (dto.answers ?? []).filter((answer) => dealtIds.has(answer.questionId));

      const options = await this.prisma.gameQuestionOption.findMany({
        where: { questionId: { in: [...dealtIds] } },
        select: { id: true, key: true, questionId: true, isCorrect: true },
      });
      const optionsById = new Map(options.map((option) => [option.id, option]));

      total = session.questionIds.length;
      for (const answer of submitted) {
        const option = optionsById.get(answer.selectedOptionId);
        const isCorrect = Boolean(option && option.questionId === answer.questionId && option.isCorrect);
        if (isCorrect) correct += 1;
        answerRows.push({
          questionId: answer.questionId,
          selectedOptionKey: option?.key ?? null,
          correct: isCorrect,
          timeMs: answer.timeMs,
        });
      }
    }

    const accuracy = accuracyPercent(correct, total);
    const stars = starsForAccuracy(correct, total);
    const xp = xpForGameAttempt(correct, total, game.difficulty);
    const durationSeconds = Math.max(1, Math.min(dto.durationSeconds, 3600));

    const attempt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.gameAttempt.create({
        data: {
          childId: dto.childId,
          gameId: game.id,
          sessionId: session.id,
          clientAttemptId: dto.clientAttemptId,
          score: correct,
          totalQuestions: total,
          correctAnswers: correct,
          wrongAnswers: Math.max(0, total - correct),
          accuracy,
          durationSeconds,
          starsAwarded: stars,
          xpAwarded: xp,
          answers: answerRows.length > 0 ? { create: answerRows } : undefined,
        },
      });

      await tx.gameSession.update({ where: { id: session.id }, data: { consumedAt: new Date() } });
      await tx.game.update({
        where: { id: game.id },
        data: {
          plays: { increment: 1 },
          completedPlays: correct === total && total > 0 ? { increment: 1 } : undefined,
          scoreSum: { increment: correct },
        },
      });

      return created;
    });

    const gameTitle = await this.titleFor(game.id, toPrismaLocale(user.locale));
    const applied = await this.progress.apply({
      childId: dto.childId,
      subjectId: game.subjectId,
      xp,
      stars,
      durationSeconds,
      questionsAnswered: total,
      correctAnswers: correct,
      gamePlayed: true,
      activity: {
        type: ActivityType.GAME_PLAYED,
        title: `Played ${gameTitle}`,
        detail: `${correct} of ${total} correct`,
        glyph: game.glyph,
        tone: game.tone,
        refId: game.id,
      },
    });

    return {
      attemptId: attempt.id,
      score: correct,
      total,
      correctAnswers: correct,
      wrongAnswers: Math.max(0, total - correct),
      accuracy,
      durationSeconds,
      starsAwarded: stars,
      xpAwarded: xp,
      unlockedAchievements: applied.unlockedAchievements,
      progress: applied.progress,
    };
  }

  /** Builds a deterministic board for MEMORY and PUZZLE from the game config. */
  private buildBoard(type: string, config: Prisma.JsonValue | null, seed: number): GameBoardDto | null {
    const parsed = (config ?? {}) as {
      faces?: string[];
      pairs?: number;
      scenes?: Array<{ id: string; title: string; tone: string; tiles: string[] }>;
    };

    if (type === GameType.MEMORY) {
      const faces = parsed.faces ?? ["🐻", "🦊", "🐼", "🐸", "🐧", "🦄", "🐯", "🐨"];
      const pairs = Math.min(parsed.pairs ?? 6, faces.length);
      const chosen = seededShuffle(faces, seed).slice(0, pairs);
      const cards = chosen.flatMap((face, index) => [
        { id: `${face}-a-${index}`, glyph: face, matchKey: face },
        { id: `${face}-b-${index}`, glyph: face, matchKey: face },
      ]);
      return { kind: "MEMORY", cards: seededShuffle(cards, seed + 7) };
    }

    const scenes = parsed.scenes ?? [
      { id: "garden", title: "Garden", tone: "mint", tiles: ["☀️", "☁️", "🦋", "🌳", "🌷", "🌳", "🌱", "🐞", "🌱"] },
    ];
    const scene = scenes[seed % scenes.length] ?? scenes[0];
    const pieces = scene.tiles.map((glyph, slot) => ({ id: `p${slot}`, glyph, slot }));
    return {
      kind: "PUZZLE",
      puzzle: {
        title: scene.title,
        tone: scene.tone,
        solution: scene.tiles,
        tray: seededShuffle(pieces, seed + 31),
      },
    };
  }

  private async titleFor(gameId: string, locale: PrismaLocale): Promise<string> {
    const translations = await this.prisma.gameTranslation.findMany({ where: { gameId } });
    return pickTranslation(translations, locale)?.title ?? "a game";
  }

  private toDto(game: GameRow, locale: PrismaLocale): GameDto {
    const translation = pickTranslation(game.translations, locale);
    const subjectTranslation = game.subject ? pickTranslation(game.subject.translations, locale) : undefined;

    return {
      id: game.id,
      slug: game.slug,
      type: game.type,
      title: translation?.title ?? game.slug,
      description: translation?.description ?? "",
      subjectId: game.subjectId,
      subject: game.subject
        ? {
            id: game.subject.id,
            slug: game.subject.slug,
            name: subjectTranslation?.name ?? game.subject.slug,
            description: subjectTranslation?.description ?? "",
            glyph: game.subject.glyph,
            tone: game.subject.tone,
            order: game.subject.order,
            lessonCount: 0,
          }
        : undefined,
      ageCategory: game.ageCategory,
      difficulty: game.difficulty,
      status: game.status,
      glyph: game.glyph,
      tone: game.tone,
      roundsPerSession: game.roundsPerSession,
      plays: game.plays,
      completionRate: game.plays > 0 ? Math.round((game.completedPlays / game.plays) * 100) : 0,
      averageScore: game.plays > 0 ? Math.round((game.scoreSum / game.plays) * 10) / 10 : 0,
      updatedAt: game.updatedAt.toISOString(),
    };
  }
}
