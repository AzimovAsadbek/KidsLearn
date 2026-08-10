import type { AgeBand, Tone } from "@/types";

export interface StoryBook {
  id: string;
  title: string;
  glyph: string;
  tone: Tone;
  pages: number;
  ageBand: AgeBand;
  subjectId: string;
  minutes: number;
}

export interface VideoItem {
  id: string;
  title: string;
  glyph: string;
  tone: Tone;
  seconds: number;
  ageBand: AgeBand;
  subjectId: string;
  views: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  glyph: string;
  tone: Tone;
  kind: "draw" | "trace" | "sing" | "move" | "build";
  minutes: number;
  ageBand: AgeBand;
}

export const books: StoryBook[] = [
  { id: "bk-1", title: "The Red Balloon", glyph: "🎈", tone: "coral", pages: 12, ageBand: "2-3", subjectId: "sub-colors", minutes: 5 },
  { id: "bk-2", title: "Ten Little Ducks", glyph: "🦆", tone: "sun", pages: 16, ageBand: "3-4", subjectId: "sub-numbers", minutes: 7 },
  { id: "bk-3", title: "Where Do Animals Sleep?", glyph: "🦉", tone: "grape", pages: 20, ageBand: "4-5", subjectId: "sub-animals", minutes: 8 },
  { id: "bk-4", title: "Shapes in My House", glyph: "🏠", tone: "lagoon", pages: 14, ageBand: "3-4", subjectId: "sub-shapes", minutes: 6 },
  { id: "bk-5", title: "A is for Apple", glyph: "🍎", tone: "mint", pages: 26, ageBand: "4-5", subjectId: "sub-letters", minutes: 10 },
  { id: "bk-6", title: "The Rainy Day", glyph: "🌧️", tone: "sky", pages: 18, ageBand: "5-6", subjectId: "sub-nature", minutes: 9 },
  { id: "bk-7", title: "My Busy Body", glyph: "🧒", tone: "blossom", pages: 15, ageBand: "5-6", subjectId: "sub-body", minutes: 7 },
  { id: "bk-8", title: "The Drum That Danced", glyph: "🥁", tone: "tangerine", pages: 13, ageBand: "3-4", subjectId: "sub-music", minutes: 6 },
];

export const videos: VideoItem[] = [
  { id: "vd-1", title: "Colours Song", glyph: "🌈", tone: "blossom", seconds: 148, ageBand: "2-3", subjectId: "sub-colors", views: 18420 },
  { id: "vd-2", title: "Counting Train", glyph: "🚂", tone: "sky", seconds: 205, ageBand: "3-4", subjectId: "sub-numbers", views: 22110 },
  { id: "vd-3", title: "Jungle Sounds", glyph: "🌴", tone: "mint", seconds: 176, ageBand: "2-3", subjectId: "sub-animals", views: 31240 },
  { id: "vd-4", title: "Alphabet Parade", glyph: "🔤", tone: "grape", seconds: 240, ageBand: "4-5", subjectId: "sub-letters", views: 14980 },
  { id: "vd-5", title: "Shape Detectives", glyph: "🔍", tone: "lagoon", seconds: 192, ageBand: "5-6", subjectId: "sub-shapes", views: 9870 },
  { id: "vd-6", title: "Weather Watch", glyph: "⛅", tone: "sun", seconds: 163, ageBand: "4-5", subjectId: "sub-nature", views: 7640 },
];

export const activities: ActivityItem[] = [
  { id: "ac-1", title: "Colour the Rainbow", glyph: "🖍️", tone: "blossom", kind: "draw", minutes: 10, ageBand: "2-3" },
  { id: "ac-2", title: "Trace the Letters", glyph: "✏️", tone: "grape", kind: "trace", minutes: 8, ageBand: "4-5" },
  { id: "ac-3", title: "Sing the Number Song", glyph: "🎤", tone: "sky", kind: "sing", minutes: 5, ageBand: "3-4" },
  { id: "ac-4", title: "Animal Movements", glyph: "🦘", tone: "mint", kind: "move", minutes: 7, ageBand: "2-3" },
  { id: "ac-5", title: "Build a Shape Tower", glyph: "🧱", tone: "sun", kind: "build", minutes: 12, ageBand: "5-6" },
  { id: "ac-6", title: "Draw Your Family", glyph: "👨‍👩‍👧", tone: "coral", kind: "draw", minutes: 10, ageBand: "4-5" },
];

export function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
