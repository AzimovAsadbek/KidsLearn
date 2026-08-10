import type { ErrorCode } from "./enums.js";

/**
 * Every endpoint answers with this envelope. A single shape means the web
 * client has exactly one unwrapping path and one error path.
 */
export interface ApiSuccess<T, M = undefined> {
  success: true;
  data: T;
  meta?: M;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string;
    /** Field-level messages for validation failures. Never a stack trace. */
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T, M = undefined> = ApiSuccess<T, M> | ApiFailure;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type Paginated<T> = ApiSuccess<T[], PaginationMeta>;

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface SortQuery {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchQuery {
  search?: string;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
