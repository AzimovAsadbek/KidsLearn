import type { Category, Subject } from "@/types";

export const subjects: Subject[] = [
  {
    id: "sub-colors",
    slug: "colors",
    name: "Colors",
    glyph: "🎨",
    tone: "blossom",
    lessonCount: 24,
    description: "Naming, matching and mixing the first colours.",
  },
  {
    id: "sub-animals",
    slug: "animals",
    name: "Animals",
    glyph: "🦁",
    tone: "sun",
    lessonCount: 32,
    description: "Farm, jungle and ocean animals with their sounds.",
  },
  {
    id: "sub-numbers",
    slug: "numbers",
    name: "Numbers",
    glyph: "🔢",
    tone: "sky",
    lessonCount: 28,
    description: "Counting to twenty, quantity and simple sums.",
  },
  {
    id: "sub-letters",
    slug: "letters",
    name: "Letters",
    glyph: "🔤",
    tone: "grape",
    lessonCount: 30,
    description: "Letter shapes, sounds and first words.",
  },
  {
    id: "sub-shapes",
    slug: "shapes",
    name: "Shapes",
    glyph: "🔷",
    tone: "lagoon",
    lessonCount: 18,
    description: "Circles, squares, triangles and patterns.",
  },
  {
    id: "sub-nature",
    slug: "nature",
    name: "Nature",
    glyph: "🌳",
    tone: "mint",
    lessonCount: 16,
    description: "Weather, plants and the world outside.",
  },
  {
    id: "sub-music",
    slug: "music",
    name: "Music",
    glyph: "🎵",
    tone: "tangerine",
    lessonCount: 12,
    description: "Rhythm, songs and listening games.",
  },
  {
    id: "sub-body",
    slug: "body",
    name: "My Body",
    glyph: "🧒",
    tone: "coral",
    lessonCount: 10,
    description: "Body parts, senses and healthy habits.",
  },
];

export const subjectById = new Map(subjects.map((s) => [s.id, s]));

export function getSubject(id: string): Subject {
  return subjectById.get(id) ?? subjects[0];
}

export const categories: Category[] = [
  { id: "cat-1", name: "Primary colours", subjectId: "sub-colors", itemCount: 9, status: "published", updatedAt: "2026-08-04T09:12:00Z" },
  { id: "cat-2", name: "Colour mixing", subjectId: "sub-colors", itemCount: 6, status: "published", updatedAt: "2026-07-28T11:40:00Z" },
  { id: "cat-3", name: "Farm animals", subjectId: "sub-animals", itemCount: 12, status: "published", updatedAt: "2026-08-07T14:05:00Z" },
  { id: "cat-4", name: "Jungle animals", subjectId: "sub-animals", itemCount: 11, status: "review", updatedAt: "2026-08-09T08:30:00Z" },
  { id: "cat-5", name: "Ocean animals", subjectId: "sub-animals", itemCount: 9, status: "draft", updatedAt: "2026-08-09T16:22:00Z" },
  { id: "cat-6", name: "Counting 1–10", subjectId: "sub-numbers", itemCount: 14, status: "published", updatedAt: "2026-08-01T10:00:00Z" },
  { id: "cat-7", name: "Counting 11–20", subjectId: "sub-numbers", itemCount: 10, status: "published", updatedAt: "2026-07-19T13:45:00Z" },
  { id: "cat-8", name: "Uppercase letters", subjectId: "sub-letters", itemCount: 16, status: "published", updatedAt: "2026-08-05T09:00:00Z" },
  { id: "cat-9", name: "Lowercase letters", subjectId: "sub-letters", itemCount: 14, status: "review", updatedAt: "2026-08-08T12:15:00Z" },
  { id: "cat-10", name: "Flat shapes", subjectId: "sub-shapes", itemCount: 8, status: "published", updatedAt: "2026-06-30T15:20:00Z" },
  { id: "cat-11", name: "Patterns", subjectId: "sub-shapes", itemCount: 7, status: "published", updatedAt: "2026-07-22T09:35:00Z" },
  { id: "cat-12", name: "Weather", subjectId: "sub-nature", itemCount: 6, status: "archived", updatedAt: "2026-05-11T08:10:00Z" },
  { id: "cat-13", name: "Rhythm games", subjectId: "sub-music", itemCount: 5, status: "published", updatedAt: "2026-07-30T17:00:00Z" },
  { id: "cat-14", name: "Senses", subjectId: "sub-body", itemCount: 5, status: "draft", updatedAt: "2026-08-10T07:45:00Z" },
];
