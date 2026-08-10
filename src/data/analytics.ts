import type { AiRecommendation, LeaderboardEntry, MultiSeries, SubjectStrength, TimeSeriesPoint } from "@/types";
import { children } from "./children";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

function series(labels: string[], values: number[]): TimeSeriesPoint[] {
  return labels.map((label, i) => ({ label, value: values[i] ?? 0 }));
}

/* --- Per-child learning minutes ------------------------------------------ */

export const weeklyMinutes: Record<string, TimeSeriesPoint[]> = {
  "ch-ali": series(WEEKDAYS, [22, 35, 28, 41, 33, 52, 35]),
  "ch-zarina": series(WEEKDAYS, [14, 18, 12, 25, 20, 31, 22]),
  "ch-omar": series(WEEKDAYS, [40, 46, 38, 55, 49, 62, 44]),
};

export const monthlyMinutes: Record<string, TimeSeriesPoint[]> = {
  "ch-ali": series(MONTHS, [180, 240, 310, 290, 360, 410, 455, 320]),
  "ch-zarina": series(MONTHS, [60, 95, 120, 150, 185, 210, 240, 175]),
  "ch-omar": series(MONTHS, [260, 300, 340, 395, 430, 480, 520, 390]),
};

export const weeklyLessons: Record<string, TimeSeriesPoint[]> = {
  "ch-ali": series(WEEKDAYS, [2, 4, 3, 5, 3, 6, 4]),
  "ch-zarina": series(WEEKDAYS, [1, 2, 1, 3, 2, 4, 4]),
  "ch-omar": series(WEEKDAYS, [5, 6, 4, 7, 6, 8, 3]),
};

export const weeklyAccuracy: Record<string, TimeSeriesPoint[]> = {
  "ch-ali": series(WEEKDAYS, [78, 82, 80, 88, 85, 91, 86]),
  "ch-zarina": series(WEEKDAYS, [70, 74, 68, 79, 77, 84, 79]),
  "ch-omar": series(WEEKDAYS, [86, 89, 87, 92, 90, 95, 91]),
};

export const xpGrowth: Record<string, TimeSeriesPoint[]> = {
  "ch-ali": series(MONTHS, [180, 420, 700, 940, 1180, 1420, 1660, 1840]),
  "ch-zarina": series(MONTHS, [40, 130, 240, 350, 460, 570, 680, 760]),
  "ch-omar": series(MONTHS, [420, 760, 1080, 1420, 1760, 2100, 2400, 2610]),
};

/* --- Subject strength ---------------------------------------------------- */

export const subjectStrength: Record<string, SubjectStrength[]> = {
  "ch-ali": [
    { subjectId: "sub-colors", score: 94, trend: 4 },
    { subjectId: "sub-animals", score: 91, trend: 2 },
    { subjectId: "sub-numbers", score: 72, trend: 8 },
    { subjectId: "sub-shapes", score: 65, trend: -3 },
    { subjectId: "sub-letters", score: 58, trend: 6 },
  ],
  "ch-zarina": [
    { subjectId: "sub-animals", score: 88, trend: 7 },
    { subjectId: "sub-colors", score: 81, trend: 3 },
    { subjectId: "sub-music", score: 70, trend: 5 },
    { subjectId: "sub-numbers", score: 54, trend: 9 },
    { subjectId: "sub-letters", score: 41, trend: 2 },
  ],
  "ch-omar": [
    { subjectId: "sub-numbers", score: 96, trend: 3 },
    { subjectId: "sub-letters", score: 89, trend: 5 },
    { subjectId: "sub-shapes", score: 84, trend: 1 },
    { subjectId: "sub-colors", score: 78, trend: -2 },
    { subjectId: "sub-nature", score: 69, trend: 4 },
  ],
};

/* --- Learning consistency (heat grid, 7 × 5 weeks) ----------------------- */

export const consistencyGrid: Record<string, number[]> = {
  // 0 = no activity, 4 = a very strong day
  "ch-ali": [
    0, 2, 3, 1, 4, 3, 2, 1, 3, 4, 2, 3, 4, 3, 2, 0, 1, 3, 4, 4, 3, 3, 2, 4, 3, 4, 4, 2, 1, 3, 4, 3, 4, 4, 3,
  ],
  "ch-zarina": [
    0, 1, 2, 0, 2, 1, 1, 0, 2, 3, 1, 2, 2, 1, 1, 0, 0, 2, 3, 2, 2, 1, 2, 3, 2, 3, 2, 1, 0, 2, 3, 2, 3, 3, 2,
  ],
  "ch-omar": [
    2, 3, 4, 3, 4, 4, 3, 3, 4, 4, 3, 4, 4, 4, 3, 2, 3, 4, 4, 4, 4, 4, 3, 4, 4, 4, 4, 3, 3, 4, 4, 4, 4, 4, 4,
  ],
};

/* --- AI recommendations -------------------------------------------------- */

export const recommendations: AiRecommendation[] = [
  {
    id: "rec-1",
    childId: "ch-ali",
    headline: "Practice numbers for 10 minutes today",
    rationale:
      "Ali answers colour and animal questions quickly, but numbers take about twice as long. Ten focused minutes should close that gap this week.",
    actionLabel: "Start recommended lesson",
    href: "/kids/lessons/les-numbers-1",
    subjectId: "sub-numbers",
    confidence: 87,
    minutes: 10,
  },
  {
    id: "rec-2",
    childId: "ch-zarina",
    headline: "Try letter sounds with short sessions",
    rationale:
      "Zarina is strongest right after a game. Pairing five minutes of Letter Match with the Alphabet lesson should keep her attention.",
    actionLabel: "Start recommended lesson",
    href: "/kids/lessons/les-letters-1",
    subjectId: "sub-letters",
    confidence: 74,
    minutes: 8,
  },
  {
    id: "rec-3",
    childId: "ch-omar",
    headline: "Move on to colour mixing",
    rationale:
      "Omar has mastered the basics with 96% accuracy. Mixing Colors is the natural next challenge and matches his age band.",
    actionLabel: "Start recommended lesson",
    href: "/kids/lessons/les-colors-2",
    subjectId: "sub-colors",
    confidence: 91,
    minutes: 12,
  },
];

export function recommendationFor(childId: string): AiRecommendation {
  return recommendations.find((r) => r.childId === childId) ?? recommendations[0];
}

/* --- Leaderboard --------------------------------------------------------- */

const leaderboardSeed: Array<{ name: string; glyph: string; stars: number; xp: number; childId?: string }> = [
  { name: "Ali", glyph: "👦🏻", stars: 850, xp: 1840, childId: "ch-ali" },
  { name: "Zara", glyph: "👧🏽", stars: 720, xp: 1710 },
  { name: "Omar", glyph: "🧒🏽", stars: 610, xp: 2610, childId: "ch-omar" },
  { name: "Leo", glyph: "🧑🏼", stars: 430, xp: 1290 },
  { name: "Emma", glyph: "👧🏼", stars: 310, xp: 1105 },
  { name: "Kamola", glyph: "👧🏻", stars: 288, xp: 990 },
  { name: "Bobur", glyph: "👦🏽", stars: 265, xp: 940 },
  { name: "Nilufar", glyph: "👧🏻", stars: 244, xp: 880 },
  { name: "Timur", glyph: "👦🏻", stars: 219, xp: 810 },
  { name: "Zarina", glyph: "👧🏻", stars: 205, xp: 760, childId: "ch-zarina" },
];

/**
 * Leaderboards only ever expose a display name, an illustrated avatar and the
 * two public scores. No ages, no photos, no locations.
 */
export function buildLeaderboard(currentChildId: string, scale = 1): LeaderboardEntry[] {
  return leaderboardSeed.map((entry, index) => ({
    rank: index + 1,
    childId: entry.childId ?? `anon-${index}`,
    displayName: entry.name,
    avatar: {
      glyph: entry.glyph,
      tone: children.find((c) => c.id === entry.childId)?.avatar.tone ?? "brand",
    },
    stars: Math.round(entry.stars * scale),
    xp: Math.round(entry.xp * scale),
    isCurrentChild: entry.childId === currentChildId,
  }));
}

/* --- Admin-level platform analytics -------------------------------------- */

export const platformGrowth: MultiSeries[] = [
  { name: "Users", tone: "brand", points: series(MONTHS, [420, 560, 690, 810, 960, 1080, 1180, 1256]) },
  { name: "Lessons", tone: "mint", points: series(MONTHS, [1180, 1420, 1660, 1920, 2180, 2420, 2680, 2843]) },
  { name: "Games", tone: "sun", points: series(MONTHS, [8, 10, 12, 14, 17, 19, 22, 24]) },
];

export const userGrowthWeekly: TimeSeriesPoint[] = series(
  ["Week 1", "Week 2", "Week 3", "Week 4"],
  [46, 62, 71, 88],
);

export const dailyActivity: TimeSeriesPoint[] = series(WEEKDAYS, [1420, 1680, 1510, 1890, 2010, 2480, 2160]);

export const lessonCompletionTrend: TimeSeriesPoint[] = series(WEEKDAYS, [64, 68, 66, 72, 75, 81, 78]);

export const subjectShare: Array<{ label: string; value: number; subjectId: string }> = [
  { label: "Colors", value: 35, subjectId: "sub-colors" },
  { label: "Animals", value: 25, subjectId: "sub-animals" },
  { label: "Numbers", value: 20, subjectId: "sub-numbers" },
  { label: "Letters", value: 12, subjectId: "sub-letters" },
  { label: "Others", value: 8, subjectId: "sub-shapes" },
];

export const retentionCohort: TimeSeriesPoint[] = series(
  ["D1", "D3", "D7", "D14", "D30", "D60"],
  [100, 78, 62, 51, 43, 36],
);
