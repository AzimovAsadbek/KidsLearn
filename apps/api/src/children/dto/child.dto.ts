import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";
import { Locale } from "@kidslearn/types";

export class CreateChildDto {
  @ApiProperty({ example: "Ali", maxLength: 40 })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name!: string;

  @ApiProperty({ example: "2021-03-14", description: "ISO date. Age is always derived from this." })
  @IsISO8601({ strict: true }, { message: "dateOfBirth must be an ISO date such as 2021-03-14" })
  dateOfBirth!: string;

  @ApiProperty({ example: "👦🏻", description: "Illustrated avatar glyph — never a photo" })
  @IsString()
  @MaxLength(16)
  avatarGlyph!: string;

  @ApiProperty({ example: "sky", description: "Design-system tone name" })
  @IsString()
  @MaxLength(24)
  avatarTone!: string;

  @ApiPropertyOptional({ enum: ["uz", "ru", "en"] })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  @ApiPropertyOptional({ minimum: 1, maximum: 20, default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  dailyGoalLessons?: number;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  favouriteSubjectId?: string;
}

export class UpdateChildDto extends PartialType(CreateChildDto) {}

export class ChildProgressResponse {
  @ApiProperty() childId!: string;
  @ApiProperty() level!: number;
  @ApiProperty() xp!: number;
  @ApiProperty() xpIntoLevel!: number;
  @ApiProperty() xpForNextLevel!: number;
  @ApiProperty() stars!: number;
  @ApiProperty() points!: number;
  @ApiProperty() lessonsCompleted!: number;
  @ApiProperty() gamesPlayed!: number;
  @ApiProperty() questionsAnswered!: number;
  @ApiProperty() correctAnswers!: number;
  @ApiProperty() wrongAnswers!: number;
  @ApiProperty() accuracy!: number;
  @ApiProperty() learningSeconds!: number;
  @ApiProperty() currentStreak!: number;
  @ApiProperty() longestStreak!: number;
  @ApiProperty({ nullable: true, type: String }) lastActivityAt!: string | null;
  @ApiProperty() todayLessons!: number;
  @ApiProperty() todaySeconds!: number;
  @ApiProperty() todayStars!: number;
}

export class ChildResponse {
  @ApiProperty() id!: string;
  @ApiProperty() parentId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: "2021-03-14" }) dateOfBirth!: string;
  @ApiProperty({ description: "Derived server-side" }) age!: number;
  @ApiProperty({ enum: ["AGE_1_2", "AGE_3_4", "AGE_5_7"] }) ageCategory!: string;
  @ApiProperty() avatarGlyph!: string;
  @ApiProperty() avatarTone!: string;
  @ApiProperty({ enum: ["uz", "ru", "en"] }) locale!: string;
  @ApiProperty() dailyGoalLessons!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ type: ChildProgressResponse, nullable: true }) progress!: ChildProgressResponse | null;
}
