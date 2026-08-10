import type { AvatarSpec, Child, Parent } from "@/types";

/**
 * Demo content is anchored to a fixed reference date so relative timestamps are
 * identical on the server and the client — no hydration mismatch, no drift.
 */
export const NOW = new Date("2026-08-10T19:30:00.000Z");

export const parent: Parent = {
  id: "par-1",
  name: "Asadbek",
  email: "asadbek@kidslearn.app",
  phone: "+998 90 123 45 67",
  avatar: { glyph: "🧔🏻", tone: "brand" },
  locale: "en",
  joinedAt: "2024-01-18T10:00:00.000Z",
  plan: "family",
};

export const children: Child[] = [
  {
    id: "ch-ali",
    parentId: "par-1",
    name: "Ali",
    birthDate: "2021-03-14",
    avatar: { glyph: "👦🏻", tone: "sky" },
    level: 7,
    xp: 1840,
    xpToNextLevel: 2200,
    stars: 128,
    streakDays: 7,
    bestStreak: 12,
    lessonsCompleted: 48,
    gamesPlayed: 32,
    minutesLearned: 1470,
    accuracy: 86,
    lastActiveAt: "2026-08-10T18:12:00.000Z",
    joinedAt: "2024-01-20T10:00:00.000Z",
    favouriteSubjectId: "sub-colors",
    dailyGoalLessons: 6,
    dailyGoalCompleted: 4,
  },
  {
    id: "ch-zarina",
    parentId: "par-1",
    name: "Zarina",
    birthDate: "2022-06-02",
    avatar: { glyph: "👧🏻", tone: "blossom" },
    level: 4,
    xp: 760,
    xpToNextLevel: 1000,
    stars: 74,
    streakDays: 3,
    bestStreak: 8,
    lessonsCompleted: 21,
    gamesPlayed: 19,
    minutesLearned: 620,
    accuracy: 79,
    lastActiveAt: "2026-08-10T16:40:00.000Z",
    joinedAt: "2024-09-02T10:00:00.000Z",
    favouriteSubjectId: "sub-animals",
    dailyGoalLessons: 4,
    dailyGoalCompleted: 4,
  },
  {
    id: "ch-omar",
    parentId: "par-1",
    name: "Omar",
    birthDate: "2020-01-22",
    avatar: { glyph: "🧒🏽", tone: "mint" },
    level: 9,
    xp: 2610,
    xpToNextLevel: 3000,
    stars: 196,
    streakDays: 11,
    bestStreak: 21,
    lessonsCompleted: 74,
    gamesPlayed: 55,
    minutesLearned: 2280,
    accuracy: 91,
    lastActiveAt: "2026-08-09T17:05:00.000Z",
    joinedAt: "2024-01-20T10:00:00.000Z",
    favouriteSubjectId: "sub-numbers",
    dailyGoalLessons: 8,
    dailyGoalCompleted: 3,
  },
];

export const childById = new Map(children.map((c) => [c.id, c]));

export function getChild(id: string): Child {
  return childById.get(id) ?? children[0];
}

/** Avatar options offered in the "Add child" flow — illustrations, never photos. */
export const avatarChoices: AvatarSpec[] = [
  { glyph: "👦🏻", tone: "sky" },
  { glyph: "👧🏻", tone: "blossom" },
  { glyph: "🧒🏽", tone: "mint" },
  { glyph: "🦊", tone: "tangerine" },
  { glyph: "🐻", tone: "sun" },
  { glyph: "🐼", tone: "lagoon" },
  { glyph: "🦄", tone: "grape" },
  { glyph: "🐨", tone: "brand" },
  { glyph: "🐯", tone: "coral" },
  { glyph: "🐸", tone: "mint" },
  { glyph: "🐧", tone: "sky" },
  { glyph: "🦖", tone: "mint" },
];
