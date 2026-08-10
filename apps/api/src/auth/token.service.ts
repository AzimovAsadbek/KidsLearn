import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Response } from "express";
import { PrismaService } from "../common/prisma/prisma.service";
import type { AuthConfig } from "../common/config/configuration";

export const REFRESH_COOKIE = "kl_refresh";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  locale: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RotatedSession extends IssuedTokens {
  /** The owner of the rotated token, so callers don't have to look it up again. */
  userId: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly auth: AuthConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.auth = config.getOrThrow<AuthConfig>("auth");
  }

  /**
   * Refresh tokens are 384 bits of CSPRNG output, so a fast hash is the right
   * store: there is no low-entropy secret to slow an attacker down on, and
   * Argon2 on every refresh would add real latency for no security gain.
   * (Passwords, which *are* low entropy, use Argon2id — see AuthService.)
   */
  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async issue(
    user: { id: string; email: string; role: string; locale: string },
    context: { family?: string; userAgent?: string | null; ip?: string | null },
  ): Promise<IssuedTokens> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      locale: user.locale,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.auth.accessSecret,
      expiresIn: this.auth.accessTtlSeconds,
    });

    const refreshToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + this.auth.refreshTtlSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        family: context.family ?? randomUUID(),
        userAgent: context.userAgent?.slice(0, 250) ?? null,
        ip: context.ip ?? null,
        expiresAt,
      },
    });

    return { accessToken, refreshToken, expiresIn: this.auth.accessTtlSeconds };
  }

  /**
   * Rotates a refresh token.
   *
   * Presenting an already-revoked token means the token was replayed — either
   * stolen or duplicated — so the entire family is revoked and the session is
   * ended rather than silently re-issued.
   */
  async rotate(
    presentedToken: string,
    context: { userAgent?: string | null; ip?: string | null },
  ): Promise<RotatedSession | null> {
    const tokenHash = this.hash(presentedToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) return null;

    if (stored.revokedAt) {
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId}; revoking family`);
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return null;
    }

    if (stored.expiresAt.getTime() < Date.now()) return null;
    if (stored.user.deletedAt || stored.user.status === "SUSPENDED") return null;

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const issued = await this.issue(
      {
        id: stored.user.id,
        email: stored.user.email,
        role: stored.user.role,
        locale: stored.user.locale,
      },
      { family: stored.family, ...context },
    );
    return { ...issued, userId: stored.user.id };
  }

  async revoke(presentedToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(presentedToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * The refresh token never reaches application JavaScript: it lives in an
   * HttpOnly cookie scoped to the refresh endpoint's path prefix.
   */
  setRefreshCookie(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.auth.cookieSecure,
      sameSite: "lax",
      domain: this.auth.cookieDomain,
      path: "/api/v1/auth",
      maxAge: this.auth.refreshTtlSeconds * 1000,
    });
  }

  clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.auth.cookieSecure,
      sameSite: "lax",
      domain: this.auth.cookieDomain,
      path: "/api/v1/auth",
    });
  }

  /** Removes expired and long-revoked rows; called by a scheduled job. */
  async pruneExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - 7 * 86_400_000);
    const result = await this.prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] },
    });
    return result.count;
  }
}
