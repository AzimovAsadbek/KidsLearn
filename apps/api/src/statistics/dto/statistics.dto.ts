import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsISO8601, IsOptional, IsUUID } from "class-validator";

export class StatisticsQueryDto {
  @ApiPropertyOptional({
    enum: ["today", "week", "month", "year", "custom"],
    default: "week",
    description: "Use `custom` with `from` and `to` for an explicit range.",
  })
  @IsOptional()
  @IsIn(["today", "week", "month", "year", "custom"])
  preset?: "today" | "week" | "month" | "year" | "custom";

  @ApiPropertyOptional({ example: "2026-08-01", description: "Inclusive start (custom preset)" })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({ example: "2026-08-10", description: "Inclusive end (custom preset)" })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  subjectId?: string;
}

export class StatisticsSummaryResponse {
  @ApiProperty({ type: "object", additionalProperties: true }) range!: unknown;
  @ApiProperty() learningSeconds!: number;
  @ApiProperty() lessonsCompleted!: number;
  @ApiProperty() gamesPlayed!: number;
  @ApiProperty() accuracy!: number;
  @ApiProperty() xpEarned!: number;
  @ApiProperty() starsEarned!: number;
  @ApiProperty() currentStreak!: number;
  @ApiProperty() longestStreak!: number;
  @ApiProperty({ type: "object", additionalProperties: true, description: "Change vs the preceding window" })
  deltas!: unknown;
  @ApiProperty({ type: "object", additionalProperties: true, description: "Chart-ready daily series" })
  series!: unknown;
  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true } })
  subjectStrength!: unknown[];
  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true }, description: "35-day heat grid" })
  consistency!: unknown[];
}
