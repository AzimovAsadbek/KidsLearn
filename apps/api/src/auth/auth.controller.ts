import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { ClientIp, CurrentUser, Public, UserAgent, type RequestUser } from "../common/decorators";
import { ApiEnvelopeResponse } from "../common/decorators";
import { AppException } from "../common/errors/app-exception";
import { AuthService } from "./auth.service";
import { REFRESH_COOKIE, TokenService } from "./token.service";
import {
  AuthUserResponse,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ParentSettingsDto,
  PinDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
  SessionResponseDto,
} from "./dto/auth.dto";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  @Public()
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: "Create a parent account",
    description:
      "Creates the account and starts a session. The refresh token is set as an HttpOnly cookie; the access token is returned in the body for the Authorization header.",
  })
  @ApiEnvelopeResponse(SessionResponseDto, "Session created")
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
    @UserAgent() userAgent: string | null,
    @ClientIp() ip: string | null,
  ) {
    const { user, tokens } = await this.auth.register(dto, { userAgent, ip });
    this.tokens.setRefreshCookie(response, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Sign in with email and password" })
  @ApiEnvelopeResponse(SessionResponseDto, "Session created")
  @ApiUnauthorizedResponse({ description: "INVALID_CREDENTIALS" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @UserAgent() userAgent: string | null,
    @ClientIp() ip: string | null,
  ) {
    const { user, tokens } = await this.auth.login(dto.email, dto.password, { userAgent, ip });
    this.tokens.setRefreshCookie(response, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: "Exchange the refresh cookie for a new access token",
    description:
      "Rotates the refresh token. Presenting an already-used token revokes the whole token family, because reuse means the token leaked.",
  })
  @ApiEnvelopeResponse(SessionResponseDto, "Session refreshed")
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @UserAgent() userAgent: string | null,
    @ClientIp() ip: string | null,
  ) {
    const presented = (request.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!presented) throw AppException.unauthorized("No active session.");

    const rotated = await this.tokens.rotate(presented, { userAgent, ip });
    if (!rotated) {
      this.tokens.clearRefreshCookie(response);
      throw AppException.unauthorized("Your session has expired. Please sign in again.", "TOKEN_EXPIRED");
    }

    this.tokens.setRefreshCookie(response, rotated.refreshToken);
    const user = await this.auth.me(rotated.userId);
    return { user, accessToken: rotated.accessToken, expiresIn: rotated.expiresIn };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "End the current session" })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const presented = (request.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (presented) await this.tokens.revoke(presented);
    this.tokens.clearRefreshCookie(response);
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "End every session for the current user" })
  async logoutAll(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) response: Response) {
    await this.tokens.revokeAllForUser(user.id);
    this.tokens.clearRefreshCookie(response);
  }

  @Get("me")
  @ApiOperation({ summary: "Current authenticated user" })
  @ApiEnvelopeResponse(AuthUserResponse, "The signed-in user")
  async me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @ApiOperation({
    summary: "Request a password reset link",
    description:
      "Always returns success so the endpoint cannot be used to discover which email addresses are registered. Outside production the reset token is included to make local testing possible.",
  })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.auth.requestPasswordReset(dto.email);
    return { sent: true, ...result };
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @ApiOperation({ summary: "Set a new password using a reset token" })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
  }

  @Patch("profile")
  @ApiOperation({ summary: "Update the signed-in user's profile" })
  @ApiEnvelopeResponse(AuthUserResponse)
  async updateProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  @Get("parent-settings")
  @ApiOperation({ summary: "Reminder, report and PIN settings for the family account" })
  async parentSettings(@CurrentUser() user: RequestUser) {
    return this.auth.parentSettings(user.id);
  }

  @Patch("parent-settings")
  @ApiOperation({ summary: "Update reminder and report preferences" })
  async updateParentSettings(@CurrentUser() user: RequestUser, @Body() dto: ParentSettingsDto) {
    return this.auth.updateParentSettings(user.id, dto);
  }

  @Post("parent-pin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Set the PIN that gates leaving kid mode" })
  async setPin(@CurrentUser() user: RequestUser, @Body() dto: PinDto) {
    await this.auth.setParentPin(user.id, dto.pin);
  }

  @Post("parent-pin/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: "Verify the parent PIN",
    description: "`configured: false` means no PIN has been set yet; the client should offer to set one instead of blocking.",
  })
  async verifyPin(@CurrentUser() user: RequestUser, @Body() dto: PinDto) {
    const configured = await this.auth.pinConfigured(user.id);
    if (!configured) return { configured: false, valid: false };
    return { configured: true, valid: await this.auth.verifyParentPin(user.id, dto.pin) };
  }

  @Post("change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change the password of the signed-in user" })
  async changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }
}
