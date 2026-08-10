import { AgeCategory, Difficulty, MedalTier } from "./enums.js";

/**
 * Pure domain rules shared by the API and the web app.
 *
 * Keeping these in one place means an optimistic UI update and the server's
 * authoritative result are computed by the same function — the client can never
 * drift from the backend's idea of a level, a star award or an age band.
 * Everything here is deterministic and side-effect free, which is also what
 * makes it directly unit-testable.
 */

/* ============================================================================
   Age
   ========================================================================== */

/** Whole years between a date of birth and a reference instant. */
export function calculateAge(dateOfBirth: Date | string, reference: Date = new Date()): number {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) return 0;

  let age = reference.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = reference.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && reference.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

/**
 * Maps an age to a curriculum band. Ages above the top band stay in it rather
 * than falling off the end — a seven-year-old and an eight-year-old should see
 * the same content, not nothing.
 */
export function ageCategoryForAge(age: number): AgeCategory {
  if (age <= 2) return AgeCategory.AGE_1_2;
  if (age <= 4) return AgeCategory.AGE_3_4;
  return AgeCategory.AGE_5_7;
}

export function ageCategoryForDateOfBirth(dateOfBirth: Date | string, reference?: Date): AgeCategory {
  return ageCategoryForAge(calculateAge(dateOfBirth, reference));
}

/**
 * Bands a child may see. A child is shown their own band plus the one below, so
 * the library never looks empty and revision stays available.
 */
export function accessibleAgeCategories(category: AgeCategory): AgeCategory[] {
  switch (category) {
    case AgeCategory.AGE_1_2:
      return [AgeCategory.AGE_1_2];
    case AgeCategory.AGE_3_4:
      return [AgeCategory.AGE_1_2, AgeCategory.AGE_3_4];
    default:
      return [AgeCategory.AGE_3_4, AgeCategory.AGE_5_7];
  }
}

/* ============================================================================
   Levels & XP
   ========================================================================== */

/**
 * XP needed to *reach* a level. Quadratic growth keeps early levels quick and
 * later ones meaningful: L2 at 100, L5 at 800, L10 at 2700.
 */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return 100 * n + 20 * n * (n - 1);
}

export function levelForXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= safeXp && level < 200) level += 1;
  return level;
}

export interface LevelBreakdown {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  percentToNextLevel: number;
}

export function levelBreakdown(xp: number): LevelBreakdown {
  const level = levelForXp(xp);
  const floor = xpRequiredForLevel(level);
  const ceiling = xpRequiredForLevel(level + 1);
  const span = Math.max(1, ceiling - floor);
  const into = Math.max(0, xp - floor);
  return {
    level,
    xpIntoLevel: into,
    xpForNextLevel: span,
    percentToNextLevel: Math.min(100, Math.round((into / span) * 100)),
  };
}

/* ============================================================================
   Scoring
   ========================================================================== */

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  EASY: 1,
  MEDIUM: 1.25,
  HARD: 1.5,
};

/** Stars are 0–5 and reward accuracy, with a bonus only for a clean sweep. */
export function starsForAccuracy(correct: number, total: number): number {
  if (total <= 0) return 0;
  const accuracy = correct / total;
  if (correct === total) return 5;
  if (accuracy >= 0.8) return 4;
  if (accuracy >= 0.6) return 3;
  if (accuracy >= 0.4) return 2;
  if (accuracy > 0) return 1;
  return 0;
}

export function xpForGameAttempt(correct: number, total: number, difficulty: Difficulty): number {
  if (total <= 0) return 0;
  const base = correct * 5;
  const perfectBonus = correct === total ? 10 : 0;
  return Math.round((base + perfectBonus) * DIFFICULTY_MULTIPLIER[difficulty]);
}

export function accuracyPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/* ============================================================================
   Streaks
   ========================================================================== */

/**
 * Day key in a fixed IANA timezone. Streaks must not depend on where the server
 * or the browser happens to be, so every comparison goes through this.
 */
export function dayKeyInTimezone(instant: Date, timeZone: string): string {
  // en-CA yields ISO-shaped YYYY-MM-DD, which sorts and compares correctly.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function daysBetweenDayKeys(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00Z`);
  const b = Date.parse(`${later}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDayKey: string | null;
}

/**
 * Applies one activity to a streak.
 *
 * - Same day again → no change (a child can learn ten times a day).
 * - Next day → extend.
 * - A gap → restart at 1.
 * - A day key in the past (late offline sync) → leave the streak alone.
 */
export function applyActivityToStreak(state: StreakState, activityDayKey: string): StreakState {
  if (!state.lastActiveDayKey) {
    return { currentStreak: 1, longestStreak: Math.max(1, state.longestStreak), lastActiveDayKey: activityDayKey };
  }

  const gap = daysBetweenDayKeys(state.lastActiveDayKey, activityDayKey);
  if (gap === 0) return state;
  if (gap < 0) return state;

  const currentStreak = gap === 1 ? state.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    lastActiveDayKey: activityDayKey,
  };
}

/**
 * A streak is only "live" if the last activity was today or yesterday; anything
 * older has already lapsed and should read as zero without a write.
 */
export function effectiveStreak(state: StreakState, todayDayKey: string): number {
  if (!state.lastActiveDayKey) return 0;
  const gap = daysBetweenDayKeys(state.lastActiveDayKey, todayDayKey);
  return gap <= 1 ? state.currentStreak : 0;
}

/* ============================================================================
   Medals
   ========================================================================== */

export function medalTierForStars(stars: number): MedalTier | null {
  if (stars >= 500) return MedalTier.DIAMOND;
  if (stars >= 250) return MedalTier.GOLD;
  if (stars >= 100) return MedalTier.SILVER;
  if (stars >= 25) return MedalTier.BRONZE;
  return null;
}

/** Consistency level 0–4 for the heat grid, from a day's learning seconds. */
export function consistencyLevel(seconds: number): number {
  if (seconds <= 0) return 0;
  if (seconds < 300) return 1;
  if (seconds < 900) return 2;
  if (seconds < 1800) return 3;
  return 4;
}
