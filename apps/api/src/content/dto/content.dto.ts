import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
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
import { AgeCategory, ContentStatus, Difficulty, Locale } from "@kidslearn/types";
import { SearchQueryDto } from "../../common/dto/pagination.dto";

/* --- Queries -------------------------------------------------------------- */

export class LessonQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: AgeCategory })
  @IsOptional()
  @IsEnum(AgeCategory)
  ageCategory?: AgeCategory;

  @ApiPropertyOptional({ enum: Difficulty })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiPropertyOptional({ enum: ContentStatus, description: "Admin only; others always see PUBLISHED" })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ format: "uuid", description: "Scopes results and progress to one child" })
  @IsOptional()
  @IsUUID()
  childId?: string;

  @ApiPropertyOptional({ enum: ["uz", "ru", "en"] })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}

export class CategoryQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

/* --- Translations --------------------------------------------------------- */

export class TranslationDto {
  @ApiProperty({ enum: ["uz", "ru", "en"] })
  @IsEnum(Locale)
  locale!: Locale;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({ maxLength: 600 })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;
}

/* --- Writes --------------------------------------------------------------- */

export class UpsertSubjectDto {
  @ApiProperty({ example: "colors" })
  @IsString()
  @MaxLength(60)
  slug!: string;

  @ApiProperty({ example: "🎨" })
  @IsString()
  @MaxLength(16)
  glyph!: string;

  @ApiProperty({ example: "blossom" })
  @IsString()
  @MaxLength(24)
  tone!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ type: [TranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations!: TranslationDto[];
}

export class UpsertCategoryDto {
  @ApiProperty({ example: "primary-colors" })
  @IsString()
  @MaxLength(60)
  slug!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  subjectId!: string;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiProperty({ type: [TranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations!: TranslationDto[];
}

export class UpsertLessonDto {
  @ApiPropertyOptional({ example: "learn-numbers" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  subjectId!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiProperty({ enum: AgeCategory })
  @IsEnum(AgeCategory)
  ageCategory!: AgeCategory;

  @ApiProperty({ enum: Difficulty })
  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @ApiProperty({ minimum: 1, maximum: 90, example: 8 })
  @IsInt()
  @Min(1)
  @Max(90)
  durationMinutes!: number;

  @ApiProperty({ minimum: 0, maximum: 500, example: 20 })
  @IsInt()
  @Min(0)
  @Max(500)
  xpReward!: number;

  @ApiProperty({ minimum: 0, maximum: 50, example: 5 })
  @IsInt()
  @Min(0)
  @Max(50)
  starReward!: number;

  @ApiProperty({ example: "🔢" })
  @IsString()
  @MaxLength(16)
  glyph!: string;

  @ApiProperty({ example: "sky" })
  @IsString()
  @MaxLength(24)
  tone!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  videoMediaId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  audioMediaId?: string | null;

  @ApiProperty({ type: [TranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations!: TranslationDto[];
}

export class LessonAnswerDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  selectedOptionId!: string;
}

export class CompleteLessonDto {
  @ApiProperty({ description: "Idempotency key; a replay never awards XP twice", maxLength: 64 })
  @IsString()
  @MaxLength(64)
  clientAttemptId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  childId!: string;

  @ApiProperty({ minimum: 1, maximum: 3600 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  durationSeconds!: number;

  @ApiPropertyOptional({ type: [LessonAnswerDto], description: "Graded server-side" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonAnswerDto)
  answers?: LessonAnswerDto[];
}

export class ChangeStatusDto {
  @ApiProperty({ enum: ContentStatus })
  @IsEnum(ContentStatus)
  status!: ContentStatus;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

/* --- Swagger response models ---------------------------------------------- */

export class SubjectResponse {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() glyph!: string;
  @ApiProperty() tone!: string;
  @ApiProperty() order!: number;
  @ApiProperty() lessonCount!: number;
}

export class CategoryResponse {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() subjectId!: string;
  @ApiProperty({ enum: ContentStatus }) status!: string;
  @ApiProperty() itemCount!: number;
  @ApiProperty() updatedAt!: string;
}

export class LessonResponse {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() subjectId!: string;
  @ApiProperty({ nullable: true, type: String }) categoryId!: string | null;
  @ApiProperty({ enum: AgeCategory }) ageCategory!: string;
  @ApiProperty({ enum: Difficulty }) difficulty!: string;
  @ApiProperty({ enum: ContentStatus }) status!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty() xpReward!: number;
  @ApiProperty() starReward!: number;
  @ApiProperty() glyph!: string;
  @ApiProperty() tone!: string;
  @ApiProperty({ nullable: true, type: String }) coverMediaUrl!: string | null;
  @ApiProperty() completions!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ nullable: true, type: String }) publishedAt!: string | null;
}
