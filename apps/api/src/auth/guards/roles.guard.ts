import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@kidslearn/types";
import { ROLES_KEY, type RequestUser } from "../../common/decorators";
import { AppException } from "../../common/errors/app-exception";

/** Enforces `@Roles(...)`. Absent metadata means any authenticated user. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user) throw AppException.unauthorized();

    if (!required.includes(user.role)) {
      throw AppException.forbidden("You don't have permission to perform this action.");
    }
    return true;
  }
}
