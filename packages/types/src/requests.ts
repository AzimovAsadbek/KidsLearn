import type {
  AgeCategory,
  ContentStatus,
  Difficulty,
  GameType,
  LeaderboardPeriod,
  Locale,
  MediaKind,
} from "./enums.js";
import type { PaginationQuery, SearchQuery, SortQuery } from "./api.js";
import type { StatisticsPreset } from "./entities.js";

/* --- Auth ---------------------------------------------------------------- */

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  locale?: Locale;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/* --- Children ------------------------------------------------------------ */

export interface CreateChildPayload {
  name: string;
  dateOfBirth: string;
  avatarGlyph: string;
  avatarTone: string;
  locale?: Locale;
  dailyGoalLessons?: number;
  favouriteSubjectId?: string;
}

export type UpdateChildPayload = Partial<CreateChildPayload>;

/* --- Content ------------------------------------------------------------- */

export interface LessonQuery extends PaginationQuery, SearchQuery, SortQuery {
  subjectId?: string;
  categoryId?: string;
  ageCategory?: AgeCategory;
  difficulty?: Difficulty;
  status?: ContentStatus;
  /** Scopes progress and age filtering to one child. */
  childId?: string;
  locale?: Locale;
}

export interface GameQuery extends PaginationQuery, SearchQuery, SortQuery {
  subjectId?: string;
  type?: GameType;
  ageCategory?: AgeCategory;
  difficulty?: Difficulty;
  status?: ContentStatus;
  childId?: string;
}

export interface UpsertLessonPayload {
  slug?: string;
  subjectId: string;
  categoryId?: string | null;
  ageCategory: AgeCategory;
  difficulty: Difficulty;
  durationMinutes: number;
  xpReward: number;
  starReward: number;
  glyph: string;
  tone: string;
  coverMediaId?: string | null;
  videoMediaId?: string | null;
  audioMediaId?: string | null;
  translations: Array<{ locale: Locale; title: string; description: string }>;
  blocks?: Array<{
    order: number;
    type: string;
    glyph?: string | null;
    mediaId?: string | null;
    translations: Array<{ locale: Locale; title?: string; body?: string; sayIt?: string }>;
    question?: {
      correctOptionId: string;
      options: Array<{ id: string; glyph: string; translations: Array<{ locale: Locale; label: string }> }>;
      translations: Array<{ locale: Locale; prompt: string }>;
    };
  }>;
}

export interface UpsertSubjectPayload {
  slug: string;
  glyph: string;
  tone: string;
  order?: number;
  translations: Array<{ locale: Locale; name: string; description: string }>;
}

export interface UpsertCategoryPayload {
  slug: string;
  subjectId: string;
  status?: ContentStatus;
  translations: Array<{ locale: Locale; name: string }>;
}

export interface ChangeStatusPayload {
  status: ContentStatus;
  note?: string;
}

/* --- Games --------------------------------------------------------------- */

export interface StartGameSessionPayload {
  childId: string;
  /** Optional deterministic seed; the server generates one when omitted. */
  seed?: number;
}

export interface SubmitGameAttemptPayload {
  /** Client-generated UUID, used as the idempotency key for offline sync. */
  clientAttemptId: string;
  childId: string;
  sessionId: string;
  durationSeconds: number;
  answers: Array<{ questionId: string; selectedOptionId: string; correct: boolean; timeMs?: number }>;
  /** Board games report their own outcome rather than per-question answers. */
  boardResult?: { moves: number; matchedPairs?: number; placedPieces?: number };
}

export interface CompleteLessonPayload {
  clientAttemptId: string;
  childId: string;
  durationSeconds: number;
  answers?: Array<{ questionId: string; selectedOptionId: string; correct: boolean }>;
}

export interface UpdateLessonProgressPayload {
  childId: string;
  percent: number;
}

/* --- Statistics & leaderboard -------------------------------------------- */

export interface StatisticsQuery {
  childId: string;
  preset?: StatisticsPreset;
  from?: string;
  to?: string;
  subjectId?: string;
}

export interface LeaderboardQuery {
  period?: LeaderboardPeriod;
  childId?: string;
  limit?: number;
}

/* --- Admin --------------------------------------------------------------- */

export interface UserQuery extends PaginationQuery, SearchQuery, SortQuery {
  role?: "ADMIN" | "PARENT";
  status?: "ACTIVE" | "INVITED" | "SUSPENDED";
}

export interface MediaQuery extends PaginationQuery, SearchQuery, SortQuery {
  kind?: MediaKind;
  status?: ContentStatus;
}

export interface GenerateImagePayload {
  prompt: string;
  style?: string;
  ageCategory?: AgeCategory;
  subjectId?: string;
}

export interface ReviewAiJobPayload {
  approve: boolean;
  note?: string;
}

export interface UpdateFeatureFlagPayload {
  enabled: boolean;
}

export interface NotificationQuery extends PaginationQuery {
  read?: boolean;
  type?: string;
}
