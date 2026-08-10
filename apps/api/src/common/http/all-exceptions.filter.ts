import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { Prisma } from "@kidslearn/database";
import { ErrorCode } from "@kidslearn/types";
import type { Request, Response } from "express";
import { AppException } from "../errors/app-exception";

interface NormalisedError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

/**
 * Single exit point for every failure.
 *
 * Clients always receive `{ success:false, error:{ code, message } }` and never
 * a stack trace, a Prisma error string or an internal table name. The full
 * error is logged server-side with the request id for correlation.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exception");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalised = this.normalise(exception);

    if (normalised.status >= 500) {
      this.logger.error(
        {
          err: exception instanceof Error ? { message: exception.message, stack: exception.stack } : exception,
          method: request.method,
          path: request.originalUrl,
        },
        `Unhandled ${normalised.status} on ${request.method} ${request.originalUrl}`,
      );
    } else {
      this.logger.debug(`${normalised.status} ${normalised.code} on ${request.method} ${request.originalUrl}`);
    }

    response.status(normalised.status).json({
      success: false,
      error: {
        code: normalised.code,
        message: normalised.message,
        ...(normalised.details ? { details: normalised.details } : {}),
      },
    });
  }

  private normalise(exception: unknown): NormalisedError {
    if (exception instanceof AppException) {
      const body = exception.getResponse() as { code: string; message: string; details?: Record<string, string[]> };
      return {
        status: exception.getStatus(),
        code: body.code,
        message: body.message,
        details: body.details,
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: ErrorCode.RATE_LIMITED,
        message: "Too many requests. Please slow down and try again shortly.",
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      // Nest's ValidationPipe reports an array of messages; turn it into
      // field-keyed details the frontend can attach to inputs.
      if (typeof body === "object" && body !== null && "message" in body) {
        const raw = (body as { message: unknown }).message;
        if (Array.isArray(raw)) {
          return {
            status,
            code: ErrorCode.VALIDATION_ERROR,
            message: "Some fields need attention.",
            details: groupValidationMessages(raw as string[]),
          };
        }
        return { status, code: statusToCode(status), message: String(raw) };
      }
      return { status, code: statusToCode(status), message: exception.message };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return mapPrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: ErrorCode.VALIDATION_ERROR,
        message: "The request could not be processed.",
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: "Something went wrong on our side. Please try again.",
    };
  }
}

function statusToCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.VALIDATION_ERROR;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorCode.CONFLICT;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.RATE_LIMITED;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}

/** "email must be an email" → { email: ["email must be an email"] } */
function groupValidationMessages(messages: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const message of messages) {
    const field = message.split(" ")[0] ?? "_";
    grouped[field] = [...(grouped[field] ?? []), message];
  }
  return grouped;
}

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): NormalisedError {
  switch (error.code) {
    case "P2002":
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
        message: "That value is already taken.",
      };
    case "P2025":
      return {
        status: HttpStatus.NOT_FOUND,
        code: ErrorCode.NOT_FOUND,
        message: "The requested resource no longer exists.",
      };
    case "P2003":
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
        message: "This item is still referenced by other content.",
      };
    default:
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: "Something went wrong on our side. Please try again.",
      };
  }
}
