import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";
import { Transform } from "class-transformer";
import { Locale } from "@kidslearn/types";
import { CurrentUser, type RequestUser } from "../common/decorators";
import { PrismaService } from "../common/prisma/prisma.service";
import { AppException } from "../common/errors/app-exception";
import { AuthService } from "./auth.service";
import { toPrismaLocale } from "../common/utils/locale";

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name?: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ enum: ["uz", "ru", "en"] })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  @ApiPropertyOptional({ maxLength: 16 })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  avatarGlyph?: string;

  @ApiPropertyOptional({ maxLength: 24 })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  avatarTone?: string;
}

export class UpdateParentSettingsDto {
  @ApiPropertyOptional({ description: "IANA timezone used for streaks and reminders" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 23, description: "Local hour for the daily reminder" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  reminderHour?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  weeklyReportEnabled?: boolean;
}

export class SetParentPinDto {
  @ApiProperty({ description: "Four digits", example: "2468" })
  @IsString()
  @Matches(/^\d{4}$/, { message: "pin must be exactly four digits" })
  pin!: string;
}

export class VerifyParentPinDto {
  @ApiProperty({ example: "2468" })
  @IsString()
  @MaxLength(8)
  pin!: string;
}

/**
 * Self-service profile and family settings — the endpoints the parent settings
 * screen persists through, distinct from the admin user-management routes.
 */
@ApiTags("Authentication")
@Controller("auth")
export class ProfileController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Patch("profile")
  @ApiOperation({ summary: "Update the signed-in user's profile" })
  async updateProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: dto.name,
        phone: dto.phone,
        locale: dto.locale ? toPrismaLocale(dto.locale) : undefined,
        avatarGlyph: dto.avatarGlyph,
        avatarTone: dto.avatarTone,
      },
    });
    return AuthService.toAuthUser(updated);
  }

  @Get("parent-settings")
  @ApiOperation({ summary: "Family settings: timezone, reminders, weekly report" })
  async parentSettings(@CurrentUser() user: RequestUser) {
    const profile = await this.prisma.parentProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw AppException.notFound("No parent profile for this account.");
    return {
      timezone: profile.timezone,
      reminderEnabled: profile.reminderEnabled,
      reminderHour: profile.reminderHour,
      weeklyReportEnabled: profile.weeklyReportEnabled,
      hasPin: profile.parentPinHash !== null,
    };
  }

  @Patch("parent-settings")
  @ApiOperation({ summary: "Update family settings" })
  async updateParentSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateParentSettingsDto) {
    const profile = await this.prisma.parentProfile.update({
      where: { userId: user.id },
      data: {
        timezone: dto.timezone,
        reminderEnabled: dto.reminderEnabled,
        reminderHour: dto.reminderHour,
        weeklyReportEnabled: dto.weeklyReportEnabled,
      },
    });
    return {
      timezone: profile.timezone,
      reminderEnabled: profile.reminderEnabled,
      reminderHour: profile.reminderHour,
      weeklyReportEnabled: profile.weeklyReportEnabled,
      hasPin: profile.parentPinHash !== null,
    };
  }

  @Post("parent-pin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Set the PIN that gates leaving kid mode" })
  async setPin(@CurrentUser() user: RequestUser, @Body() dto: SetParentPinDto) {
    await this.auth.setParentPin(user.id, dto.pin);
  }

  @Post("parent-pin/verify")
  @ApiOperation({
    summary: "Check the kid-mode exit PIN",
    description: "`configured: false` means no PIN has been set yet; the client decides its own fallback gate.",
  })
  async verifyPin(@CurrentUser() user: RequestUser, @Body() dto: VerifyParentPinDto) {
    const profile = await this.prisma.parentProfile.findUnique({ where: { userId: user.id } });
    if (!profile?.parentPinHash) return { configured: false, valid: false };
    return { configured: true, valid: await this.auth.verifyParentPin(user.id, dto.pin) };
  }
}
