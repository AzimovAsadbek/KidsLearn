import type {
  ActivityType,
  AgeCategory,
  AiJobStatus,
  AiJobType,
  ContentStatus,
  Difficulty,
  FeatureFlagKey,
  GameType,
  LeaderboardPeriod,
  LessonBlockType,
  Locale,
  MedalTier,
  MediaKind,
  NotificationType,
  RecommendationSource,
  Role,
} from "./enums.js";

/* ============================================================================
   Identity
   ========================================================================== */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: Locale;
  avatarGlyph: string;
  avatarTone: string;
  phone: string | null;
  createdAt: string;
}

export interface SessionResponse {
  user: AuthUser;
  /** Access token; the refresh token lives in an HttpOnly cookie. */
  accessToken: string;
  expiresIn: number;
}

/* ============================================================================
   Children
   ========================================================================== */

export interface ChildDto {
  id: string;
  parentId: string;
  name: string;
  /** ISO date (no time) — age is always derived, never stored. */
  dateOfBirth: string;
  /** Derived server-side so every surface agrees. */
  age: number;
  ageCategory: AgeCategory;
  avatarGlyph: string;
  avatarTone: string;
  locale: Locale;
  dailyGoalLessons: number;
  createdAt: string;
  progress: ChildProgressDto | null;
}

export interface ChildProgressDto {
  childId: string;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  stars: number;
  points: number;
  lessonsCompleted: number;
  gamesPlayed: number;
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  learningSeconds: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt: string | null;
  /** Lessons finished today, against the child's daily goal. */
  todayLessons: number;
  todaySeconds: number;
  todayStars: number;
}

/* ============================================================================
   Curriculum
   ========================================================================== */

export interface SubjectDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  glyph: string;
  tone: string;
  order: number;
  lessonCount: number;
}

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  subjectId: string;
  subject?: SubjectDto;
  status: ContentStatus;
  itemCount: number;
  updatedAt: string;
}

export interface LessonBlockDto {
  id: string;
  order: number;
  type: LessonBlockType;
  /** Rendered copy for the active locale, already resolved by the API. */
  title: string | null;
  body: string | null;
  glyph: string | null;
  sayIt: string | null;
  mediaUrl: string | null;
  /** Present when type === QUESTION. */
  question: LessonQuestionDto | null;
}

export interface LessonQuestionDto {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string; glyph: string }>;
  /** Only sent to admins; children receive `null` and answer through the API. */
  correctOptionId: string | null;
}

export interface LessonDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  subjectId: string;
  subject?: SubjectDto;
  categoryId: string | null;
  ageCategory: AgeCategory;
  difficulty: Difficulty;
  status: ContentStatus;
  durationMinutes: number;
  xpReward: number;
  starReward: number;
  glyph: string;
  tone: string;
  coverMediaUrl: string | null;
  videoMediaUrl: string | null;
  audioMediaUrl: string | null;
  completions: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  blocks?: LessonBlockDto[];
  /** Present when the request carries a child context. */
  progress?: { percent: number; completedAt: string | null; starsEarned: number } | null;
}

export interface LessonTranslationDto {
  locale: Locale;
  title: string;
  description: string;
}

/* ============================================================================
   Games
   ========================================================================== */

export interface GameDto {
  id: string;
  slug: string;
  type: GameType;
  title: string;
  description: string;
  subjectId: string;
  subject?: SubjectDto;
  ageCategory: AgeCategory;
  difficulty: Difficulty;
  status: ContentStatus;
  glyph: string;
  tone: string;
  roundsPerSession: number;
  plays: number;
  completionRate: number;
  averageScore: number;
  updatedAt: string;
}

/** One playable round, assembled server-side so answers never ship to the client. */
export interface GameRoundDto {
  id: string;
  questionId: string;
  prompt: string;
  promptGlyph: string | null;
  promptTone: string | null;
  options: Array<{ id: string; label: string; glyph: string; tone: string | null; matchKey?: string }>;
}

export interface GameSessionDto {
  sessionId: string;
  game: GameDto;
  rounds: GameRoundDto[];
  /** Board payload for MEMORY and PUZZLE, which don't use rounds. */
  board: GameBoardDto | null;
}

export interface GameBoardDto {
  kind: "MEMORY" | "PUZZLE";
  /** Memory: shuffled cards. Puzzle: tray pieces plus the solved layout. */
  cards?: Array<{ id: string; glyph: string; matchKey: string }>;
  puzzle?: {
    title: string;
    tone: string;
    solution: string[];
    tray: Array<{ id: string; glyph: string; slot: number }>;
  };
}

export interface SubmitAnswerResultDto {
  correct: boolean;
  correctOptionId: string;
}

export interface GameAttemptResultDto {
  attemptId: string;
  score: number;
  total: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  durationSeconds: number;
  starsAwarded: number;
  xpAwarded: number;
  /** Achievements that unlocked as a direct result of this attempt. */
  unlockedAchievements: AchievementDto[];
  progress: ChildProgressDto;
}

export interface LessonCompletionResultDto {
  lessonId: string;
  xpAwarded: number;
  starsAwarded: number;
  unlockedAchievements: AchievementDto[];
  progress: ChildProgressDto;
}

/* ============================================================================
   Rewards
   ========================================================================== */

export interface AchievementDto {
  id: string;
  code: string;
  title: string;
  description: string;
  glyph: string;
  tone: string;
  tier: MedalTier;
  category: string;
  xpReward: number;
  /** 0–100 for the child in context. */
  progress: number;
  unlockedAt: string | null;
}

export interface RewardDto {
  id: string;
  code: string;
  title: string;
  description: string;
  glyph: string;
  tone: string;
  costStars: number;
  claimed: boolean;
  claimedAt: string | null;
}

export interface CertificateDto {
  id: string;
  childId: string;
  childName: string;
  title: string;
  programme: string;
  serial: string;
  xp: number;
  stars: number;
  issuedAt: string;
  /** Signed URL to the generated PDF, or null while it is still rendering. */
  pdfUrl: string | null;
  status: "PENDING" | "READY" | "FAILED";
}

/* ============================================================================
   Activity, analytics, notifications
   ========================================================================== */

export interface ActivityDto {
  id: string;
  childId: string;
  type: ActivityType;
  title: string;
  detail: string;
  glyph: string;
  tone: string;
  xp: number | null;
  stars: number | null;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  glyph: string;
  tone: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

export interface TimeSeriesPointDto {
  label: string;
  /** ISO date the bucket starts at, for the client's own formatting. */
  date: string;
  value: number;
}

export interface SubjectStrengthDto {
  subjectId: string;
  subjectName: string;
  glyph: string;
  tone: string;
  score: number;
  trend: number;
  totalAnswers: number;
  correctAnswers: number;
}

export interface StatisticsSummaryDto {
  range: { from: string; to: string; preset: StatisticsPreset };
  learningSeconds: number;
  lessonsCompleted: number;
  gamesPlayed: number;
  accuracy: number;
  xpEarned: number;
  starsEarned: number;
  currentStreak: number;
  longestStreak: number;
  /** Deltas against the immediately preceding window of the same length. */
  deltas: {
    learningSeconds: number;
    lessonsCompleted: number;
    gamesPlayed: number;
    accuracy: number;
    xpEarned: number;
    starsEarned: number;
  };
  series: {
    learningMinutes: TimeSeriesPointDto[];
    lessons: TimeSeriesPointDto[];
    accuracy: TimeSeriesPointDto[];
    xp: TimeSeriesPointDto[];
  };
  subjectStrength: SubjectStrengthDto[];
  /** Day buckets for the consistency heat grid, oldest first. */
  consistency: Array<{ date: string; level: number }>;
}

export type StatisticsPreset = "today" | "week" | "month" | "year" | "custom";

export interface LeaderboardEntryDto {
  rank: number;
  childId: string;
  displayName: string;
  avatarGlyph: string;
  avatarTone: string;
  stars: number;
  xp: number;
  isCurrentChild: boolean;
}

export interface LeaderboardDto {
  period: LeaderboardPeriod;
  generatedAt: string;
  entries: LeaderboardEntryDto[];
  currentChild: LeaderboardEntryDto | null;
}

export interface RecommendationDto {
  id: string;
  childId: string;
  headline: string;
  rationale: string;
  actionLabel: string;
  subjectId: string | null;
  subjectName: string | null;
  lessonId: string | null;
  lessonSlug: string | null;
  minutes: number;
  confidence: number;
  source: RecommendationSource;
  createdAt: string;
  expiresAt: string;
}

/* ============================================================================
   Media & AI
   ========================================================================== */

export interface MediaDto {
  id: string;
  filename: string;
  kind: MediaKind;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  url: string;
  status: ContentStatus;
  aiPrompt: string | null;
  usedIn: number;
  createdAt: string;
  createdByName: string | null;
}

export interface AiJobDto {
  id: string;
  type: AiJobType;
  status: AiJobStatus;
  prompt: string;
  style: string | null;
  ageCategory: AgeCategory | null;
  subjectId: string | null;
  provider: string;
  /** Null while queued, or when running in preview mode. */
  media: MediaDto | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  reviewedByName: string | null;
  reviewNote: string | null;
}

export interface AiProviderStatusDto {
  imageGeneration: {
    configured: boolean;
    provider: string;
    /** Honest label shown in the admin UI when nothing is wired up. */
    mode: "live" | "preview";
  };
  recommendations: {
    configured: boolean;
    provider: string;
    mode: "live" | "rule-based";
  };
}

/* ============================================================================
   Platform
   ========================================================================== */

export type FeatureFlagsDto = Record<FeatureFlagKey, boolean>;

export interface AuditLogDto {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export interface AdminMetricsDto {
  totalUsers: number;
  totalParents: number;
  totalChildren: number;
  totalLessons: number;
  totalGames: number;
  activeUsers: number;
  deltas: Record<string, number>;
}

export interface AdminAnalyticsDto {
  dau: number;
  wau: number;
  mau: number;
  lessonCompletionRate: number;
  gameCompletionRate: number;
  averageSessionSeconds: number;
  retentionD30: number;
  userGrowth: TimeSeriesPointDto[];
  dailyActivity: TimeSeriesPointDto[];
  lessonCompletionTrend: TimeSeriesPointDto[];
  subjectShare: Array<{ subjectId: string; label: string; tone: string; value: number }>;
  retentionCurve: TimeSeriesPointDto[];
  topLessons: Array<{ id: string; title: string; glyph: string; tone: string; completions: number }>;
  topGames: Array<{ id: string; title: string; glyph: string; tone: string; plays: number }>;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

export interface PushStatusDto {
  configured: boolean;
  publicKey: string | null;
  subscribed: boolean;
}
