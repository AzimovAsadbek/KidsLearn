import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "@kidslearn/types";

/**
 * The only exception type the application throws deliberately.
 *
 * It carries a stable machine-readable code alongside the HTTP status, so the
 * web client can branch on `CHILD_NOT_FOUND` rather than parsing prose.
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode | string,
    message: string,
    status: HttpStatus,
    readonly details?: Record<string, string[]>,
  ) {
    super({ code, message, details }, status);
  }

  static badRequest(message: string, code: ErrorCode | string = ErrorCode.VALIDATION_ERROR, details?: Record<string, string[]>) {
    return new AppException(code, message, HttpStatus.BAD_REQUEST, details);
  }

  static unauthorized(message = "Authentication required", code: ErrorCode | string = ErrorCode.UNAUTHORIZED) {
    return new AppException(code, message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(message = "You don't have access to this resource", code: ErrorCode | string = ErrorCode.FORBIDDEN) {
    return new AppException(code, message, HttpStatus.FORBIDDEN);
  }

  static notFound(message: string, code: ErrorCode | string = ErrorCode.NOT_FOUND) {
    return new AppException(code, message, HttpStatus.NOT_FOUND);
  }

  static conflict(message: string, code: ErrorCode | string = ErrorCode.CONFLICT) {
    return new AppException(code, message, HttpStatus.CONFLICT);
  }

  static unprocessable(message: string, code: ErrorCode | string = ErrorCode.VALIDATION_ERROR) {
    return new AppException(code, message, HttpStatus.UNPROCESSABLE_ENTITY);
  }

  static providerNotConfigured(message: string) {
    return new AppException(ErrorCode.PROVIDER_NOT_CONFIGURED, message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
