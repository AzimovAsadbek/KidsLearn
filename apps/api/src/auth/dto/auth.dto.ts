import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Locale } from "@kidslearn/types";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*\d).{8,72}$/;
const PASSWORD_MESSAGE = "password must be at least 8 characters and contain a letter and a number";

const normaliseEmail = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: "Asadbek Azimov", maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name!: string;

  @ApiProperty({ example: "parent@kidslearn.app" })
  @IsEmail({}, { message: "email must be a valid email address" })
  @MaxLength(160)
  @Transform(normaliseEmail)
  email!: string;

  @ApiProperty({ example: "kidslearn2026", minLength: 8, description: PASSWORD_MESSAGE })
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password!: string;

  @ApiPropertyOptional({ enum: ["uz", "ru", "en"], default: "en" })
  @IsOptional()
  @IsEnum(Locale, { message: "locale must be one of uz, ru, en" })
  locale?: Locale;

  @ApiPropertyOptional({ example: "+998901234567" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: "parent@kidslearn.app" })
  @IsEmail({}, { message: "email must be a valid email address" })
  @Transform(normaliseEmail)
  email!: string;

  @ApiProperty({ example: "kidslearn2026" })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "parent@kidslearn.app" })
  @IsEmail()
  @Transform(normaliseEmail)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: "Token from the reset email" })
  @IsString()
  @MinLength(20)
  token!: string;

  @ApiProperty({ minLength: 8, description: PASSWORD_MESSAGE })
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ minLength: 8, description: PASSWORD_MESSAGE })
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}

/* --- Swagger response models --------------------------------------------- */

export class AuthUserResponse {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ["ADMIN", "PARENT"] }) role!: string;
  @ApiProperty({ enum: ["uz", "ru", "en"] }) locale!: string;
  @ApiProperty() avatarGlyph!: string;
  @ApiProperty() avatarTone!: string;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty() createdAt!: string;
}

export class SessionResponseDto {
  @ApiProperty({ type: AuthUserResponse }) user!: AuthUserResponse;
  @ApiProperty({ description: "Bearer token for the Authorization header" }) accessToken!: string;
  @ApiProperty({ description: "Access token lifetime in seconds" }) expiresIn!: number;
}
