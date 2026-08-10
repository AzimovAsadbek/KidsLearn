/**
 * Typed application configuration.
 *
 * Everything the app needs is read once, here, and validated at boot — a
 * missing secret should stop the process immediately rather than surface as a
 * confusing 500 an hour later.
 */

export interface AppConfig {
  env: "development" | "test" | "production";
  port: number;
  corsOrigins: string[];
  timezone: string;
  logLevel: string;
}

export interface AuthConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  cookieDomain: string | undefined;
  cookieSecure: boolean;
}

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicUrl: string;
  forcePathStyle: boolean;
}

export interface AiConfig {
  imageProvider: string;
  imageApiKey: string | undefined;
  imageModel: string;
  recommendationProvider: string;
  recommendationApiKey: string | undefined;
  recommendationModel: string;
}

export interface PushConfig {
  publicKey: string | undefined;
  privateKey: string | undefined;
  subject: string;
}

export interface Configuration {
  app: AppConfig;
  auth: AuthConfig;
  databaseUrl: string;
  redisUrl: string;
  storage: StorageConfig;
  ai: AiConfig;
  push: PushConfig;
  throttle: { ttl: number; limit: number; authLimit: number };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1";
}

export function loadConfiguration(): Configuration {
  const env = (process.env.NODE_ENV ?? "development") as AppConfig["env"];
  const isProduction = env === "production";

  const accessSecret = required("JWT_ACCESS_SECRET");
  const refreshSecret = required("JWT_REFRESH_SECRET");

  // A weak secret in production is a security defect, not a warning.
  if (isProduction) {
    for (const [name, value] of [
      ["JWT_ACCESS_SECRET", accessSecret],
      ["JWT_REFRESH_SECRET", refreshSecret],
    ] as const) {
      if (value.length < 32 || value.startsWith("change-me") || value.startsWith("dev_only")) {
        throw new Error(`${name} must be a strong, non-default secret of at least 32 characters in production`);
      }
    }
  }

  return {
    app: {
      env,
      port: num("API_PORT", 4000),
      corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
      timezone: process.env.APP_TIMEZONE ?? "Asia/Tashkent",
      logLevel: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
    },
    auth: {
      accessSecret,
      refreshSecret,
      accessTtlSeconds: num("JWT_ACCESS_TTL", 900),
      refreshTtlSeconds: num("JWT_REFRESH_TTL", 2_592_000),
      cookieDomain: optional("COOKIE_DOMAIN"),
      cookieSecure: bool("COOKIE_SECURE", isProduction),
    },
    databaseUrl: required("DATABASE_URL"),
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    storage: {
      endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
      region: process.env.S3_REGION ?? "us-east-1",
      accessKey: process.env.S3_ACCESS_KEY ?? "kidslearn",
      secretKey: process.env.S3_SECRET_KEY ?? "kidslearn_dev_secret",
      bucket: process.env.S3_BUCKET ?? "kidslearn",
      publicUrl: process.env.S3_PUBLIC_URL ?? "http://localhost:9000/kidslearn",
      forcePathStyle: bool("S3_FORCE_PATH_STYLE", true),
    },
    ai: {
      imageProvider: process.env.AI_IMAGE_PROVIDER ?? "preview",
      imageApiKey: optional("AI_IMAGE_API_KEY"),
      imageModel: process.env.AI_IMAGE_MODEL ?? "gpt-image-1",
      recommendationProvider: process.env.AI_RECOMMENDATION_PROVIDER ?? "rule-based",
      recommendationApiKey: optional("AI_RECOMMENDATION_API_KEY"),
      recommendationModel: process.env.AI_RECOMMENDATION_MODEL ?? "claude-opus-5",
    },
    push: {
      publicKey: optional("VAPID_PUBLIC_KEY"),
      privateKey: optional("VAPID_PRIVATE_KEY"),
      subject: process.env.VAPID_SUBJECT ?? "mailto:help@kidslearn.app",
    },
    throttle: {
      ttl: num("THROTTLE_TTL", 60),
      limit: num("THROTTLE_LIMIT", 120),
      authLimit: num("AUTH_THROTTLE_LIMIT", 10),
    },
  };
}

/** Narrow accessor so services never index into config with loose strings. */
export type ConfigKey = keyof Configuration;
