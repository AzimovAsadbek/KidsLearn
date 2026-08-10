import type { AdminMetric, AdminUser, MediaAsset } from "@/types";

export const adminMetrics: AdminMetric[] = [
  { id: "m-users", label: "admin.totalUsers", value: 1256, deltaPercent: 12, glyph: "👥", tone: "brand" },
  { id: "m-parents", label: "admin.totalParents", value: 984, deltaPercent: 9, glyph: "🧑‍🤝‍🧑", tone: "lagoon" },
  { id: "m-children", label: "admin.totalChildren", value: 2843, deltaPercent: 18, glyph: "🧒", tone: "mint" },
  { id: "m-lessons", label: "admin.totalLessons", value: 156, deltaPercent: 8, glyph: "📚", tone: "sun" },
  { id: "m-games", label: "admin.totalGames", value: 24, deltaPercent: 15, glyph: "🎮", tone: "blossom" },
  { id: "m-active", label: "admin.activeUsers", value: 738, deltaPercent: -3, glyph: "⚡", tone: "tangerine" },
];

export const advancedMetrics: AdminMetric[] = [
  { id: "m-dau", label: "DAU", value: 738, deltaPercent: 4, glyph: "📈", tone: "brand" },
  { id: "m-wau", label: "WAU", value: 2140, deltaPercent: 7, glyph: "📊", tone: "sky" },
  { id: "m-mau", label: "MAU", value: 4980, deltaPercent: 11, glyph: "🗓️", tone: "grape" },
  { id: "m-lesson-rate", label: "Lesson completion rate", value: 78, deltaPercent: 3, glyph: "✅", tone: "mint", format: "percent" },
  { id: "m-game-rate", label: "Game completion rate", value: 84, deltaPercent: 5, glyph: "🎯", tone: "sun", format: "percent" },
  { id: "m-session", label: "Avg. session duration", value: 17, deltaPercent: 6, glyph: "⏱️", tone: "lagoon", format: "duration" },
  { id: "m-retention", label: "D30 retention", value: 43, deltaPercent: -2, glyph: "🔁", tone: "tangerine", format: "percent" },
  { id: "m-nps", label: "Parent satisfaction", value: 92, deltaPercent: 2, glyph: "💜", tone: "blossom", format: "percent" },
];

const FIRST_NAMES = [
  "Asadbek", "Madina", "Jasur", "Nilufar", "Bekzod", "Kamola", "Sardor", "Dilnoza",
  "Rustam", "Gulnora", "Anvar", "Sevara", "Timur", "Zilola", "Farrux", "Malika",
  "Otabek", "Shahzoda", "Islom", "Aziza", "Doston", "Nodira", "Ulugbek", "Feruza",
];
const LAST_NAMES = [
  "Azimov", "Karimova", "Tursunov", "Yusupova", "Rahimov", "Ismoilova", "Nazarov", "Qodirova",
];
const GLYPHS = ["🧔🏻", "👩🏻", "🧑🏽", "👩🏽", "🧔🏽", "👩🏻‍🦱", "🧑🏻", "👩🏼"];
const TONES = ["brand", "sky", "mint", "sun", "blossom", "lagoon", "grape", "coral"] as const;

/**
 * A deterministic 48-row user table. Real enough to exercise sorting, filtering
 * and pagination without shipping invented personal data that looks real.
 */
export const adminUsers: AdminUser[] = Array.from({ length: 48 }, (_, i) => {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
  const day = String((i % 28) + 1).padStart(2, "0");
  const month = String((i % 8) + 1).padStart(2, "0");
  const status = i % 11 === 0 ? "suspended" : i % 7 === 0 ? "invited" : "active";
  const role = i % 9 === 0 ? "admin" : "parent";
  return {
    id: `usr-${100 + i}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    phone: `+998 9${i % 10} ${100 + i} ${20 + (i % 70)} ${10 + (i % 80)}`,
    role,
    status,
    childrenCount: (i % 4) + 1,
    createdAt: `2026-${month}-${day}T09:00:00.000Z`,
    lastSeenAt: `2026-08-${String(10 - (i % 10)).padStart(2, "0")}T${String(8 + (i % 12)).padStart(2, "0")}:15:00.000Z`,
    avatar: { glyph: GLYPHS[i % GLYPHS.length], tone: TONES[i % TONES.length] },
  } satisfies AdminUser;
});

const MEDIA_SEED: Array<[string, MediaAsset["kind"], string, MediaAsset["tone"]]> = [
  ["red-apple-illustration", "image", "🍎", "coral"],
  ["jungle-lion", "image", "🦁", "sun"],
  ["counting-blocks", "image", "🧱", "sky"],
  ["alphabet-poster", "image", "🔤", "grape"],
  ["rainbow-scene", "image", "🌈", "blossom"],
  ["farm-animals-song", "audio", "🎵", "mint"],
  ["cow-moo", "audio", "🐄", "tangerine"],
  ["lion-roar", "audio", "🦁", "sun"],
  ["number-song", "audio", "🔢", "sky"],
  ["colors-intro", "video", "🎬", "blossom"],
  ["shapes-story", "video", "📽️", "lagoon"],
  ["weather-day", "video", "⛅", "sun"],
  ["avatar-fox", "avatar", "🦊", "tangerine"],
  ["avatar-panda", "avatar", "🐼", "lagoon"],
  ["avatar-unicorn", "avatar", "🦄", "grape"],
  ["avatar-dino", "avatar", "🦖", "mint"],
  ["ai-friendly-apple", "generated", "🍏", "mint"],
  ["ai-happy-sun", "generated", "☀️", "sun"],
  ["ai-blue-whale", "generated", "🐋", "sky"],
  ["ai-shape-friends", "generated", "🔷", "lagoon"],
];

export const mediaAssets: MediaAsset[] = MEDIA_SEED.map(([name, kind, glyph, tone], i) => ({
  id: `med-${200 + i}`,
  name: `${name}.${kind === "audio" ? "mp3" : kind === "video" ? "mp4" : "png"}`,
  kind,
  glyph,
  tone,
  sizeKb: 120 + i * 87,
  dimensions: kind === "image" || kind === "avatar" || kind === "generated" ? "1024 × 1024" : undefined,
  durationSeconds: kind === "audio" ? 12 + i : kind === "video" ? 90 + i * 7 : undefined,
  uploadedAt: `2026-0${(i % 8) + 1}-${String((i % 27) + 1).padStart(2, "0")}T10:00:00.000Z`,
  usedIn: (i * 3) % 14,
  status: kind === "generated" && i % 2 === 0 ? "review" : "published",
  aiPrompt:
    kind === "generated"
      ? `A friendly ${name.replace("ai-", "").replace(/-/g, " ")} for a 3-year-old children's lesson`
      : undefined,
}));

export const aiStyles = [
  { id: "cute", label: "Cute educational illustration", glyph: "🎨" },
  { id: "flat", label: "Flat vector, bold shapes", glyph: "🟦" },
  { id: "paper", label: "Paper cut-out collage", glyph: "📄" },
  { id: "claymation", label: "Soft clay 3D", glyph: "🧸" },
  { id: "watercolor", label: "Gentle watercolour", glyph: "💧" },
] as const;

export const adminActivity: Array<{ id: string; title: string; detail: string; at: string; glyph: string; tone: MediaAsset["tone"] }> = [
  { id: "aa-1", title: "New lesson added", detail: "Animals in the Jungle", at: "2026-08-10T17:30:00.000Z", glyph: "📚", tone: "mint" },
  { id: "aa-2", title: "New user registered", detail: "Parent: Madina Karimova", at: "2026-08-10T17:20:00.000Z", glyph: "👤", tone: "brand" },
  { id: "aa-3", title: "New game added", detail: "Puzzle — Ocean scene", at: "2026-08-10T17:00:00.000Z", glyph: "🎮", tone: "sun" },
  { id: "aa-4", title: "Achievement created", detail: "Gold Medal — 100 stars", at: "2026-08-10T16:30:00.000Z", glyph: "🏆", tone: "tangerine" },
  { id: "aa-5", title: "AI image approved", detail: "ai-friendly-apple.png", at: "2026-08-10T15:10:00.000Z", glyph: "🤖", tone: "grape" },
  { id: "aa-6", title: "Lesson archived", detail: "Weather (v1)", at: "2026-08-10T14:00:00.000Z", glyph: "🗄️", tone: "sky" },
];
