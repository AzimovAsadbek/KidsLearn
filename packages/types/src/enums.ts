/**
 * Enum values shared by the API and the web app.
 *
 * These mirror the Prisma enums exactly. They are declared as const objects
 * rather than TypeScript `enum`s so the web bundle can use them as plain values
 * without pulling the Prisma client into the browser.
 */

export const Role = {
  ADMIN: "ADMIN",
  PARENT: "PARENT",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** Age bands the curriculum is organised around. */
export const AgeCategory = {
  AGE_1_2: "AGE_1_2",
  AGE_3_4: "AGE_3_4",
  AGE_5_7: "AGE_5_7",
} as const;
export type AgeCategory = (typeof AgeCategory)[keyof typeof AgeCategory];

export const AGE_CATEGORY_RANGE: Record<AgeCategory, { min: number; max: number; label: string }> = {
  AGE_1_2: { min: 1, max: 2, label: "1–2" },
  AGE_3_4: { min: 3, max: 4, label: "3–4" },
  AGE_5_7: { min: 5, max: 7, label: "5–7" },
};

export const ContentStatus = {
  DRAFT: "DRAFT",
  REVIEW: "REVIEW",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export const Difficulty = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const GameType = {
  COLOR_MATCH: "COLOR_MATCH",
  ANIMAL_SOUNDS: "ANIMAL_SOUNDS",
  LETTER_MATCH: "LETTER_MATCH",
  NUMBER_GAME: "NUMBER_GAME",
  PUZZLE: "PUZZLE",
  MEMORY: "MEMORY",
} as const;
export type GameType = (typeof GameType)[keyof typeof GameType];

export const LessonBlockType = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  AUDIO: "AUDIO",
  VIDEO: "VIDEO",
  QUESTION: "QUESTION",
  INTERACTION: "INTERACTION",
  ANIMATION: "ANIMATION",
} as const;
export type LessonBlockType = (typeof LessonBlockType)[keyof typeof LessonBlockType];

export const MedalTier = {
  BRONZE: "BRONZE",
  SILVER: "SILVER",
  GOLD: "GOLD",
  DIAMOND: "DIAMOND",
} as const;
export type MedalTier = (typeof MedalTier)[keyof typeof MedalTier];

export const NotificationType = {
  LESSON_REMINDER: "LESSON_REMINDER",
  NEW_LESSON: "NEW_LESSON",
  REWARD_EARNED: "REWARD_EARNED",
  ACHIEVEMENT_EARNED: "ACHIEVEMENT_EARNED",
  STREAK: "STREAK",
  SYSTEM: "SYSTEM",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const ActivityType = {
  LESSON_COMPLETED: "LESSON_COMPLETED",
  LESSON_STARTED: "LESSON_STARTED",
  GAME_PLAYED: "GAME_PLAYED",
  ACHIEVEMENT_EARNED: "ACHIEVEMENT_EARNED",
  REWARD_CLAIMED: "REWARD_CLAIMED",
  STREAK_EXTENDED: "STREAK_EXTENDED",
  CERTIFICATE_ISSUED: "CERTIFICATE_ISSUED",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const MediaKind = {
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  AUDIO: "AUDIO",
  AVATAR: "AVATAR",
  GENERATED: "GENERATED",
  CERTIFICATE: "CERTIFICATE",
} as const;
export type MediaKind = (typeof MediaKind)[keyof typeof MediaKind];

export const AiJobType = {
  IMAGE_GENERATION: "IMAGE_GENERATION",
  RECOMMENDATION: "RECOMMENDATION",
} as const;
export type AiJobType = (typeof AiJobType)[keyof typeof AiJobType];

export const AiJobStatus = {
  /** Accepted, waiting for a worker. */
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  /** Finished and awaiting human review. */
  AWAITING_REVIEW: "AWAITING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  FAILED: "FAILED",
  /** No provider configured — the job was not sent anywhere. */
  PREVIEW_ONLY: "PREVIEW_ONLY",
} as const;
export type AiJobStatus = (typeof AiJobStatus)[keyof typeof AiJobStatus];

export const RecommendationSource = {
  RULE_BASED: "RULE_BASED",
  AI: "AI",
} as const;
export type RecommendationSource = (typeof RecommendationSource)[keyof typeof RecommendationSource];

export const LeaderboardPeriod = {
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  ALL_TIME: "ALL_TIME",
} as const;
export type LeaderboardPeriod = (typeof LeaderboardPeriod)[keyof typeof LeaderboardPeriod];

export const FeatureFlagKey = {
  AI_RECOMMENDATIONS: "AI_RECOMMENDATIONS",
  AI_IMAGE_GENERATION: "AI_IMAGE_GENERATION",
  VOICE_CONTROL: "VOICE_CONTROL",
  PWA: "PWA",
  LEADERBOARD: "LEADERBOARD",
  PUSH_NOTIFICATIONS: "PUSH_NOTIFICATIONS",
  CERTIFICATES: "CERTIFICATES",
  OFFLINE_LESSONS: "OFFLINE_LESSONS",
} as const;
export type FeatureFlagKey = (typeof FeatureFlagKey)[keyof typeof FeatureFlagKey];

export const Locale = {
  UZ: "uz",
  RU: "ru",
  EN: "en",
} as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

export const LOCALES: Locale[] = ["uz", "en", "ru"];

/** Stable error codes the frontend maps to friendly copy. */
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  CHILD_NOT_FOUND: "CHILD_NOT_FOUND",
  LESSON_NOT_FOUND: "LESSON_NOT_FOUND",
  GAME_NOT_FOUND: "GAME_NOT_FOUND",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
  UPLOAD_REJECTED: "UPLOAD_REJECTED",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
