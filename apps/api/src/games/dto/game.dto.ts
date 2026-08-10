import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { AgeCategory, ContentStatus, Difficulty, GameType } from "@kidslearn/types";
import { SearchQueryDto } from "../../common/dto/pagination.dto";

export class GameQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ enum: GameType })
  @IsOptional()
  @IsEnum(GameType)
  type?: GameType;

  @ApiPropertyOptional({ enum: AgeCategory })
  @IsOptional()
  @IsEnum(AgeCategory)
  ageCategory?: AgeCategory;

  @ApiPropertyOptional({ enum: Difficulty })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiPropertyOptional({ enum: ContentStatus, description: "Admin only" })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ format: "uuid", description: "Restricts results to the child's age band" })
  @IsOptional()
  @IsUUID()
  childId?: string;
}

export class StartSessionDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  childId!: string;

  @ApiPropertyOptional({ description: "Deterministic seed; generated when omitted" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  seed?: number;
}

export class AttemptAnswerDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  selectedOptionId!: string;

  @ApiPropertyOptional({ description: "Client-side correctness; the server re-grades regardless" })
  @IsOptional()
  @IsBoolean()
  correct?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timeMs?: number;
}

export class GradeAnswerDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  selectedOptionId!: string;
}

export class BoardResultDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  moves!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  matchedPairs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  placedPieces?: number;
}

export class SubmitAttemptDto {
  @ApiProperty({
    description: "Client-generated idempotency key. Replays return the original attempt without re-awarding XP.",
    maxLength: 64,
  })
  @IsString()
  @MaxLength(64)
  clientAttemptId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  childId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ minimum: 1, maximum: 3600 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  durationSeconds!: number;

  @ApiPropertyOptional({ type: [AttemptAnswerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttemptAnswerDto)
  answers?: AttemptAnswerDto[];

  @ApiPropertyOptional({ type: BoardResultDto, description: "Used by MEMORY and PUZZLE" })
  @IsOptional()
  @ValidateNested()
  @Type(() => BoardResultDto)
  boardResult?: BoardResultDto;
}

/* --- Swagger response models ---------------------------------------------- */

export class GameResponse {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: GameType }) type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() subjectId!: string;
  @ApiProperty({ enum: AgeCategory }) ageCategory!: string;
  @ApiProperty({ enum: Difficulty }) difficulty!: string;
  @ApiProperty({ enum: ContentStatus }) status!: string;
  @ApiProperty() glyph!: string;
  @ApiProperty() tone!: string;
  @ApiProperty() roundsPerSession!: number;
  @ApiProperty() plays!: number;
  @ApiProperty() completionRate!: number;
  @ApiProperty() averageScore!: number;
  @ApiProperty() updatedAt!: string;
}

export class GameSessionResponse {
  @ApiProperty() sessionId!: string;
  @ApiProperty({ type: GameResponse }) game!: GameResponse;
  @ApiProperty({ description: "Rounds without answer keys", type: "array", items: { type: "object", additionalProperties: true } })
  rounds!: unknown[];
  @ApiProperty({
    nullable: true,
    type: "object",
    additionalProperties: true,
    description: "Board payload for MEMORY and PUZZLE",
  })
  board!: unknown;
}

export class GameAttemptResultResponse {
  @ApiProperty() attemptId!: string;
  @ApiProperty() score!: number;
  @ApiProperty() total!: number;
  @ApiProperty() correctAnswers!: number;
  @ApiProperty() wrongAnswers!: number;
  @ApiProperty() accuracy!: number;
  @ApiProperty() durationSeconds!: number;
  @ApiProperty() starsAwarded!: number;
  @ApiProperty() xpAwarded!: number;
  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true } })
  unlockedAchievements!: unknown[];
  @ApiProperty({ type: "object", additionalProperties: true }) progress!: unknown;
}
