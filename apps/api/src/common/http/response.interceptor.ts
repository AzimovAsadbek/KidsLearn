import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";

/** Marks a payload that already carries its own `meta` (pagination, etc.). */
export const RAW_ENVELOPE = Symbol("RAW_ENVELOPE");

export interface EnvelopedPayload<T, M> {
  [RAW_ENVELOPE]: true;
  data: T;
  meta: M;
}

export function withMeta<T, M>(data: T, meta: M): EnvelopedPayload<T, M> {
  return { [RAW_ENVELOPE]: true, data, meta };
}

function isEnveloped(value: unknown): value is EnvelopedPayload<unknown, unknown> {
  return typeof value === "object" && value !== null && RAW_ENVELOPE in value;
}

/**
 * Wraps every successful response in `{ success, data, meta }`.
 *
 * Controllers return plain domain objects (or `withMeta(...)` when they have
 * pagination) and never think about the envelope, which is what keeps the shape
 * identical across ~90 endpoints.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (isEnveloped(payload)) {
          return { success: true, data: payload.data, meta: payload.meta };
        }
        return { success: true, data: payload ?? null };
      }),
    );
  }
}
