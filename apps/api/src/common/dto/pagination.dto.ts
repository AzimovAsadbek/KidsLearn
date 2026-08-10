import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PaginationMeta } from "@kidslearn/types";

export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, description: "1-based page number" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

export class SearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Free-text search", maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: "Field to sort by" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sortBy?: string;

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder: "asc" | "desc" = "desc";
}

export function paginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Whitelists a client-supplied sort field. Passing an arbitrary string into a
 * Prisma `orderBy` would let a caller order by columns they cannot see.
 */
export function safeOrderBy<T extends string>(
  requested: string | undefined,
  allowed: readonly T[],
  fallback: T,
  direction: "asc" | "desc" = "desc",
): Record<string, "asc" | "desc"> {
  const field = allowed.includes(requested as T) ? (requested as T) : fallback;
  return { [field]: direction };
}
