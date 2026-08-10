import { SetMetadata, createParamDecorator, type ExecutionContext, applyDecorators } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, ApiQuery, getSchemaPath } from "@nestjs/swagger";
import type { Role } from "@kidslearn/types";
import type { Request } from "express";

/** Session user attached by the JWT strategy. */
export interface RequestUser {
  id: string;
  email: string;
  role: Role;
  locale: string;
}

export const IS_PUBLIC_KEY = "isPublic";
/** Opts an endpoint out of the global JWT guard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: RequestUser }>();
  const user = request.user;
  if (!user) return undefined;
  return data ? user[data] : user;
});

/** Client IP, honouring a single trusted proxy hop. */
export const ClientIp = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.ip ?? request.socket.remoteAddress ?? null;
});

export const UserAgent = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.headers["user-agent"] ?? null;
});

/**
 * Documents the paginated envelope for Swagger. Without this the generated
 * docs would show the bare array and omit `meta`, which would make the
 * documentation wrong rather than merely thin.
 */
export function ApiPaginatedResponse<TModel extends new (...args: never[]) => unknown>(
  model: TModel,
  description?: string,
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiQuery({ name: "page", required: false, type: Number, description: "1-based page number" }),
    ApiQuery({ name: "limit", required: false, type: Number, description: "Items per page (max 100)" }),
    ApiOkResponse({
      description,
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "array", items: { $ref: getSchemaPath(model) } },
          meta: {
            type: "object",
            properties: {
              page: { type: "number", example: 1 },
              limit: { type: "number", example: 20 },
              total: { type: "number", example: 137 },
              totalPages: { type: "number", example: 7 },
              hasNext: { type: "boolean", example: true },
              hasPrevious: { type: "boolean", example: false },
            },
          },
        },
      },
    }),
  );
}

/** Documents the standard `{ success, data }` envelope for a single object. */
export function ApiEnvelopeResponse<TModel extends new (...args: never[]) => unknown>(
  model: TModel,
  description?: string,
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description,
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { $ref: getSchemaPath(model) },
        },
      },
    }),
  );
}
