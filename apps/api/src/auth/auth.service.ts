import { Injectable, Logger } from "@nestjs/common";
import * as argon2 from "argon2";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ErrorCode, type AuthUser, type Locale } from "@kidslearn/types";
import type { User } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { AppException } from "../common/errors/app-exception";
import { TokenService, type IssuedTokens } from "./token.service";
import { toApiLocale, toPrismaLocale } from "../common/utils/locale";
import type { RegisterDto } from "./dto/auth.dto";

/**
 * Argon2id with parameters that stay comfortably above OWASP's 2024 floor
 * (19 MiB memory, 2 iterations) while remaining fast enough for an interactive
 * login on modest hardware.
 */
const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  static toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      locale: toApiLocale(user.locale),
      avatarGlyph: user.avatarGlyph,
      avatarTone: user.avatarTone,
      phone: user.phone,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON_OPTIONS);
  }

  async register(
    dto: RegisterDto,
    context: { userAgent?: string | null; ip?: string | null },
  ): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw AppException.conflict("An account with that email already exists.", ErrorCode.EMAIL_TAKEN);
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: await this.hashPassword(dto.password),
        role: "PARENT",
        locale: toPrismaLocale((dto.locale ?? "en") as Locale),
        phone: dto.phone ?? null,
        avatarGlyph: "🧑",
        avatarTone: "brand",
        parentProfile: { create: {} },
      },
    });

    this.logger.log(`Registered parent ${user.id}`);
    const issued = await this.tokens.issue(
      { id: user.id, email: user.email, role: user.role, locale: user.locale },
      context,
    );
    return { user: AuthService.toAuthUser(user), tokens: issued };
  }

  async login(
    email: string,
    password: string,
    context: { userAgent?: string | null; ip?: string | null },
  ): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always run a verification so a missing account and a wrong password take
    // the same time — otherwise the endpoint becomes an account oracle.
    const hash = user?.passwordHash ?? (await this.dummyHash());
    const valid = await argon2.verify(hash, password).catch(() => false);

    if (!user || !valid || user.deletedAt) {
      throw AppException.unauthorized("Email or password is incorrect.", ErrorCode.INVALID_CREDENTIALS);
    }
    if (user.status === "SUSPENDED") {
      throw AppException.forbidden("This account has been suspended.");
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });

    const issued = await this.tokens.issue(
      { id: user.id, email: user.email, role: user.role, locale: user.locale },
      context,
    );
    return { user: AuthService.toAuthUser(user), tokens: issued };
  }

  private dummyHashCache: string | null = null;
  private async dummyHash(): Promise<string> {
    this.dummyHashCache ??= await argon2.hash(randomBytes(32).toString("hex"), ARGON_OPTIONS);
    return this.dummyHashCache;
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw AppException.unauthorized("Session is no longer valid.");
    return AuthService.toAuthUser(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirstOrThrow({ where: { id: userId, deletedAt: null } });
    const valid = await argon2.verify(user.passwordHash, currentPassword).catch(() => false);
    if (!valid) {
      throw AppException.badRequest("Your current password is incorrect.", ErrorCode.INVALID_CREDENTIALS);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.hashPassword(newPassword) },
    });
    // Changing a password ends every other session.
    await this.tokens.revokeAllForUser(userId);
  }

  /**
   * Always resolves, whether or not the address exists — the response must not
   * reveal which emails are registered. Returns the token only in non-production
   * so local development can complete the flow without a mail server.
   */
  async requestPasswordReset(email: string): Promise<{ devToken?: string }> {
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) return {};

    const token = randomBytes(32).toString("base64url");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 30 * 60_000),
      },
    });

    this.logger.log(`Password reset requested for user ${user.id}`);
    return process.env.NODE_ENV === "production" ? {} : { devToken: token };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw AppException.badRequest("This reset link is invalid or has expired.", ErrorCode.TOKEN_EXPIRED);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await this.hashPassword(newPassword) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async updateProfile(
    userId: string,
    dto: { name?: string; phone?: string | null; locale?: Locale; avatarGlyph?: string; avatarTone?: string },
  ): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        phone: dto.phone,
        locale: dto.locale ? toPrismaLocale(dto.locale) : undefined,
        avatarGlyph: dto.avatarGlyph,
        avatarTone: dto.avatarTone,
      },
    });
    return AuthService.toAuthUser(user);
  }

  async parentSettings(userId: string) {
    const profile = await this.prisma.parentProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return {
      timezone: profile.timezone,
      reminderEnabled: profile.reminderEnabled,
      reminderHour: profile.reminderHour,
      weeklyReportEnabled: profile.weeklyReportEnabled,
      hasPin: profile.parentPinHash !== null,
    };
  }

  async updateParentSettings(
    userId: string,
    dto: { timezone?: string; reminderEnabled?: boolean; reminderHour?: number; weeklyReportEnabled?: boolean },
  ) {
    await this.prisma.parentProfile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
    return this.parentSettings(userId);
  }

  async pinConfigured(userId: string): Promise<boolean> {
    const profile = await this.prisma.parentProfile.findUnique({ where: { userId } });
    return profile?.parentPinHash !== null && profile !== null;
  }

  /** Constant-time compare for the parent PIN that gates kid-mode exit. */
  async verifyParentPin(userId: string, pin: string): Promise<boolean> {
    const profile = await this.prisma.parentProfile.findUnique({ where: { userId } });
    if (!profile?.parentPinHash) return false;
    return argon2.verify(profile.parentPinHash, pin).catch(() => false);
  }

  async setParentPin(userId: string, pin: string): Promise<void> {
    await this.prisma.parentProfile.update({
      where: { userId },
      data: { parentPinHash: await argon2.hash(pin, ARGON_OPTIONS) },
    });
  }

  /** Exposed for tests that need to assert constant-time behaviour. */
  static safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
