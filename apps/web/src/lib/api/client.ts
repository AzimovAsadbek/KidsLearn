import type { ApiFailure, ApiResponse, PaginationMeta } from "@kidslearn/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Error thrown for any non-2xx response.
 *
 * It carries the API's stable error `code`, so screens branch on
 * `CHILD_NOT_FOUND` rather than matching on prose, plus field-level `details`
 * that forms attach directly to inputs.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/* --------------------------------------------------------------------------
   Access token lives in memory only.

   Keeping it out of localStorage means an XSS payload cannot simply read it,
   and the refresh token is an HttpOnly cookie the page can never touch. The
   cost is that a hard reload starts tokenless — which is exactly what the
   silent refresh on boot is for.
   ------------------------------------------------------------------------ */

let accessToken: string | null = null;
const tokenListeners = new Set<(token: string | null) => void>();

export function setAccessToken(token: string | null): void {
  accessToken = token;
  for (const listener of tokenListeners) listener(token);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function onAccessTokenChange(listener: (token: string | null) => void): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

/* --------------------------------------------------------------------------
   Single-flight refresh

   Several queries can 401 at once when a token expires. Without this guard each
   would fire its own refresh and rotation would invalidate the others, logging
   the user out. One in-flight promise is shared by every caller.
   ------------------------------------------------------------------------ */

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        setAccessToken(null);
        return false;
      }
      const payload = (await response.json()) as ApiResponse<{ accessToken: string }>;
      if (!payload.success) {
        setAccessToken(null);
        return false;
      }
      setAccessToken(payload.data.accessToken);
      return true;
    } catch {
      setAccessToken(null);
      return false;
    } finally {
      // Cleared on the next tick so concurrent callers all observe this result.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skips the automatic refresh-and-retry (used by the auth calls themselves). */
  skipAuthRetry?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function execute<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PaginationMeta }> {
  const { body, skipAuthRetry, query, headers, ...rest } = options;

  const send = async (): Promise<Response> =>
    fetch(buildUrl(path, query), {
      ...rest,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await send();

  // A 401 on an authenticated call usually just means the short-lived access
  // token expired; rotate once and replay before surfacing an error.
  if (response.status === 401 && !skipAuthRetry) {
    const refreshed = await refreshSession();
    if (refreshed) response = await send();
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  let payload: ApiResponse<T, PaginationMeta>;
  try {
    payload = (await response.json()) as ApiResponse<T, PaginationMeta>;
  } catch {
    throw new ApiError(
      "INTERNAL_ERROR",
      response.ok ? "The server sent an unexpected response." : "Something went wrong. Please try again.",
      response.status,
    );
  }

  if (!response.ok || !payload.success) {
    const failure = payload as ApiFailure;
    throw new ApiError(
      failure.error?.code ?? "INTERNAL_ERROR",
      failure.error?.message ?? "Something went wrong. Please try again.",
      response.status,
      failure.error?.details,
    );
  }

  return { data: payload.data, meta: payload.meta };
}

/** Typed verbs. Every one unwraps the envelope so callers get plain domain data. */
export const api = {
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return (await execute<T>(path, { ...options, method: "GET" })).data;
  },
  /** Use when the response carries pagination `meta` alongside the rows. */
  async getPage<T>(path: string, options?: RequestOptions): Promise<{ items: T[]; meta: PaginationMeta }> {
    const result = await execute<T[]>(path, { ...options, method: "GET" });
    return {
      items: result.data,
      meta: result.meta ?? { page: 1, limit: result.data.length, total: result.data.length, totalPages: 1, hasNext: false, hasPrevious: false },
    };
  },
  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return (await execute<T>(path, { ...options, method: "POST", body })).data;
  },
  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return (await execute<T>(path, { ...options, method: "PATCH", body })).data;
  },
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return (await execute<T>(path, { ...options, method: "DELETE" })).data;
  },
  /**
   * Multipart upload with progress. Uses XHR because fetch still has no upload
   * progress events; auth and the envelope behave exactly like execute().
   */
  upload<T>(path: string, form: FormData, onProgress?: (percent: number) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
      xhr.withCredentials = true;
      const token = getAccessToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const payload = JSON.parse(xhr.responseText) as ApiResponse<T>;
          if (xhr.status >= 200 && xhr.status < 300 && payload.success) {
            resolve(payload.data);
            return;
          }
          const failure = payload as ApiFailure;
          reject(
            new ApiError(
              failure.error?.code ?? "INTERNAL_ERROR",
              failure.error?.message ?? "Upload failed.",
              xhr.status,
              failure.error?.details,
            ),
          );
        } catch {
          reject(new ApiError("INTERNAL_ERROR", "Upload failed.", xhr.status));
        }
      };
      xhr.onerror = () => reject(new ApiError("INTERNAL_ERROR", "Upload failed. Check your connection.", 0));
      xhr.send(form);
    });
  },
  refreshSession,
};
