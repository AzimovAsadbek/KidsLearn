import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { AgeCategory, AiJobStatus } from "@kidslearn/types";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class GenerateImageDto {
  @ApiProperty({
    example: "A friendly red apple for a 3-year-old children's lesson",
    minLength: 8,
    maxLength: 500,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  prompt!: string;

  @ApiPropertyOptional({ example: "Cute educational illustration" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  style?: string;

  @ApiPropertyOptional({ enum: AgeCategory })
  @IsOptional()
  @IsEnum(AgeCategory)
  ageCategory?: AgeCategory;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  subjectId?: string;
}

export class ReviewAiJobDto {
  @ApiProperty({ description: "true publishes the asset, false archives it" })
  @IsBoolean()
  approve!: boolean;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class AiJobQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AiJobStatus })
  @IsOptional()
  @IsEnum(AiJobStatus)
  status?: AiJobStatus;
}

export class AiProviderStatusResponse {
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description: "`mode: preview` means no image model is configured and output is a labelled placeholder",
  })
  imageGeneration!: unknown;

  @ApiProperty({ type: "object", additionalProperties: true })
  recommendations!: unknown;
}

export class AiJobResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ["IMAGE_GENERATION", "RECOMMENDATION"] }) type!: string;
  @ApiProperty({ enum: AiJobStatus }) status!: string;
  @ApiProperty() prompt!: string;
  @ApiProperty({ nullable: true, type: String }) style!: string | null;
  @ApiProperty() provider!: string;
  @ApiProperty({ nullable: true, type: "object", additionalProperties: true }) media!: unknown;
  @ApiProperty({ nullable: true, type: String }) error!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true, type: String }) completedAt!: string | null;
}

export class RecommendationResponse {
  @ApiProperty() id!: string;
  @ApiProperty() childId!: string;
  @ApiProperty() headline!: string;
  @ApiProperty() rationale!: string;
  @ApiProperty() actionLabel!: string;
  @ApiProperty({ nullable: true, type: String }) subjectId!: string | null;
  @ApiProperty({ nullable: true, type: String }) subjectName!: string | null;
  @ApiProperty({ nullable: true, type: String }) lessonId!: string | null;
  @ApiProperty({ nullable: true, type: String }) lessonSlug!: string | null;
  @ApiProperty() minutes!: number;
  @ApiProperty() confidence!: number;
  @ApiProperty({ enum: ["RULE_BASED", "AI"] }) source!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() expiresAt!: string;
}
