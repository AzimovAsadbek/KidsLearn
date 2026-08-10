import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AppException } from "../../common/errors/app-exception";
import { toApiLocale } from "../../common/utils/locale";
import type { AuthConfig } from "../../common/config/configuration";
import type { RequestUser } from "../../common/decorators";
import type { AccessTokenPayload } from "../token.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const auth = config.getOrThrow<AuthConfig>("auth");
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: auth.accessSecret,
    });
  }

  /**
   * The token is only half the check: the account is re-read on every request
   * so a suspended or deleted user loses access immediately rather than at the
   * end of their token's lifetime.
   */
  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, role: true, locale: true, status: true },
    });

    if (!user) throw AppException.unauthorized("Session is no longer valid.");
    if (user.status === "SUSPENDED") throw AppException.forbidden("This account has been suspended.");

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      locale: toApiLocale(user.locale),
    };
  }
}
