import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../../common/decorators";
import { AppException } from "../../common/errors/app-exception";

/**
 * Registered globally, so authentication is the default and every public route
 * has to opt out explicitly with `@Public()`. Forgetting a guard therefore
 * fails closed.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  override handleRequest<TUser>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      const reason = info instanceof Error ? info.message : undefined;
      if (reason === "jwt expired") {
        throw AppException.unauthorized("Your session has expired. Please sign in again.", "TOKEN_EXPIRED");
      }
      throw AppException.unauthorized();
    }
    return user;
  }
}
