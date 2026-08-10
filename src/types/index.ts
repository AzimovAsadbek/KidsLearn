import type { Tone } from "@/lib/tone";

export type { Tone };

/* ============================================================================
   Identity
   ========================================================================== */

export type UserRole = "parent" | "child" | "admin";

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: AvatarSpec;
  locale: Locale;
  joinedAt: string;
  plan: "free" | "family" | "school";
}

export interface Child {
  id: string;
  parentId: string;
  name: string;
  birthDate: string;
  avatar: AvatarSpec;
  level: number;
  xp: number;
  xpToNextLevel: number;
  stars: number;
  streakDays: number;
  bestStreak: number;
  lessonsCompleted: number;
  gamesPlayed: number;
  minutesLearned: number;
  accuracy: number;
  lastActiveAt: string;
  joinedAt: string;
  favouriteSubjectId: string;
  dailyGoalLessons: number;
  dailyGoalCompleted: number;
}

/** Avatars are generated illustrations, not uploads — no PII in the child UI. */
export interface AvatarSpec {
  /** Emoji or short glyph rendered as the face. */
  glyph: string;
  tone: Tone;
}

/* ============================================================================
   Curriculum
   ========================================================================== */

export type AgeBand = "1-2" | "2-3" | "3-4" | "4-5" | "5-6" | "6-7";
export type Difficulty = "easy" | "medium" | "hard";
export type ContentStatus = "draft" | "review" | "published" | "archived";

export interface Subject {
  id: string;
  slug: string;
  name: string;
  glyph: string;
  tone: Tone;
  lessonCount: number;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  subjectId: string;
  itemCount: number;
  status: ContentStatus;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  subjectId: string;
  ageBand: AgeBand;
  difficulty: Difficulty;
  durationMinutes: number;
  glyph: string;
  tone: Tone;
  status: ContentStatus;
  description: string;
  steps: LessonStep[];
  xpReward: number;
  starReward: number;
  createdAt: string;
  updatedAt: string;
  completions: number;
}

export type LessonStep =
  | { kind: "intro"; id: string; title: string; body: string; glyph: string }
  | { kind: "teach"; id: string; title: string; body: string; glyph: string; sayIt: string }
  | {
      kind: "quiz";
      id: string;
      title: string;
      prompt: string;
      options: LessonOption[];
      correctId: string;
    }
  | { kind: "practice"; id: string; title: string; prompt: string; targets: LessonOption[]; correctId: string }
  | { kind: "celebrate"; id: string; title: string; body: string; glyph: string };

export interface LessonOption {
  id: string;
  label: string;
  glyph: string;
  tone?: Tone;
}

/** Progress a specific child has against a specific lesson. */
export interface LessonProgress {
  lessonId: string;
  childId: string;
  percent: number;
  completedAt?: string;
  starsEarned: number;
}

/* ============================================================================
   Games
   ========================================================================== */

export type GameType = "color-match" | "animal-sounds" | "letter-match" | "number-match" | "puzzle" | "memory";

export interface Game {
  id: string;
  type: GameType;
  title: string;
  subjectId: string;
  ageBand: AgeBand;
  difficulty: Difficulty;
  glyph: string;
  tone: Tone;
  status: ContentStatus;
  description: string;
  plays: number;
  completionRate: number;
  averageScore: number;
  updatedAt: string;
}

export interface GameRound {
  id: string;
  /** What the child is asked to find. Rendered large, spoken aloud. */
  prompt: string;
  /** Optional glyph shown as the question subject (a letter, a number, a colour swatch). */
  promptGlyph?: string;
  promptTone?: Tone;
  options: GameOption[];
  correctId: string;
}

export interface GameOption {
  id: string;
  label: string;
  glyph: string;
  tone?: Tone;
  /** Memory/puzzle pairs share a matchKey. */
  matchKey?: string;
}

export interface GameResult {
  gameId: string;
  score: number;
  total: number;
  stars: number;
  xp: number;
  accuracy: number;
  durationSeconds: number;
}

/* ============================================================================
   Rewards
   ========================================================================== */

export type MedalTier = "bronze" | "silver" | "gold" | "diamond";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  glyph: string;
  tone: Tone;
  tier: MedalTier;
  /** 0–100. 100 means unlocked. */
  progress: number;
  unlockedAt?: string;
  xpReward: number;
  category: "learning" | "streak" | "games" | "mastery" | "social";
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  glyph: string;
  tone: Tone;
  costStars: number;
  unlocked: boolean;
}

export interface Certificate {
  id: string;
  childId: string;
  title: string;
  programme: string;
  issuedAt: string;
  xp: number;
  stars: number;
  serial: string;
}

/* ============================================================================
   Activity, analytics, notifications
   ========================================================================== */

export type ActivityKind = "lesson" | "game" | "achievement" | "reward" | "streak" | "certificate";

export interface ActivityEvent {
  id: string;
  childId: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  at: string;
  tone: Tone;
  glyph: string;
  xp?: number;
  stars?: number;
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface MultiSeries {
  name: string;
  tone: Tone;
  points: TimeSeriesPoint[];
}

export interface SubjectStrength {
  subjectId: string;
  score: number;
  trend: number;
}

export type NotificationCategory = "achievement" | "content" | "reminder" | "streak" | "system";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  at: string;
  read: boolean;
  tone: Tone;
  glyph: string;
  href?: string;
}

export interface LeaderboardEntry {
  rank: number;
  childId: string;
  displayName: string;
  avatar: AvatarSpec;
  stars: number;
  xp: number;
  isCurrentChild: boolean;
}

export interface AiRecommendation {
  id: string;
  childId: string;
  headline: string;
  rationale: string;
  actionLabel: string;
  href: string;
  subjectId: string;
  confidence: number;
  minutes: number;
}

/* ============================================================================
   Admin
   ========================================================================== */

export type AccountStatus = "active" | "invited" | "suspended";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  childrenCount: number;
  createdAt: string;
  lastSeenAt: string;
  avatar: AvatarSpec;
}

export type MediaKind = "image" | "video" | "audio" | "avatar" | "generated";

export interface MediaAsset {
  id: string;
  name: string;
  kind: MediaKind;
  glyph: string;
  tone: Tone;
  sizeKb: number;
  dimensions?: string;
  durationSeconds?: number;
  uploadedAt: string;
  usedIn: number;
  status: ContentStatus;
  aiPrompt?: string;
}

export interface AdminMetric {
  id: string;
  label: string;
  value: number;
  deltaPercent: number;
  glyph: string;
  tone: Tone;
  format?: "number" | "percent" | "duration";
}

/* ============================================================================
   Platform
   ========================================================================== */

export type Locale = "en" | "uz" | "ru";
export type ThemePreference = "light" | "dark" | "system";
export type VoiceState = "idle" | "listening" | "processing" | "success" | "error";

export interface DataState<T> {
  status: "loading" | "ready" | "empty" | "error";
  data?: T;
}
