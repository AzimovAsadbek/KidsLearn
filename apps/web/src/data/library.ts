import type { AgeBand, Locale, Tone } from "@/types";

/**
 * The curated starter shelf: books, videos and off-screen activities that ship
 * with the product. This is deliberately static content, not CMS data — there
 * is no backend model for it. Titles carry all three locales inline.
 */

type LocalisedTitle = Record<Locale, string>;

export interface StoryBook {
  id: string;
  title: LocalisedTitle;
  glyph: string;
  tone: Tone;
  pages: number;
  ageBand: AgeBand;
  subjectId: string;
  minutes: number;
}

export interface VideoItem {
  id: string;
  title: LocalisedTitle;
  glyph: string;
  tone: Tone;
  seconds: number;
  ageBand: AgeBand;
  subjectId: string;
  views: number;
}

export interface ActivityItem {
  id: string;
  title: LocalisedTitle;
  glyph: string;
  tone: Tone;
  kind: "draw" | "trace" | "sing" | "move" | "build";
  minutes: number;
  ageBand: AgeBand;
}

export const books: StoryBook[] = [
  { id: "bk-1", title: { en: "The Red Balloon", uz: "Qizil shar", ru: "Красный шарик" }, glyph: "🎈", tone: "coral", pages: 12, ageBand: "2-3", subjectId: "sub-colors", minutes: 5 },
  { id: "bk-2", title: { en: "Ten Little Ducks", uz: "O'nta o'rdakcha", ru: "Десять утят" }, glyph: "🦆", tone: "sun", pages: 16, ageBand: "3-4", subjectId: "sub-numbers", minutes: 7 },
  { id: "bk-3", title: { en: "Where Do Animals Sleep?", uz: "Hayvonlar qayerda uxlaydi?", ru: "Где спят животные?" }, glyph: "🦉", tone: "grape", pages: 20, ageBand: "4-5", subjectId: "sub-animals", minutes: 8 },
  { id: "bk-4", title: { en: "Shapes in My House", uz: "Uyimdagi shakllar", ru: "Фигуры в моём доме" }, glyph: "🏠", tone: "lagoon", pages: 14, ageBand: "3-4", subjectId: "sub-shapes", minutes: 6 },
  { id: "bk-5", title: { en: "A is for Apple", uz: "A — anor", ru: "А — арбуз" }, glyph: "🍎", tone: "mint", pages: 26, ageBand: "4-5", subjectId: "sub-letters", minutes: 10 },
  { id: "bk-6", title: { en: "The Rainy Day", uz: "Yomg'irli kun", ru: "Дождливый день" }, glyph: "🌧️", tone: "sky", pages: 18, ageBand: "5-6", subjectId: "sub-nature", minutes: 9 },
  { id: "bk-7", title: { en: "My Busy Body", uz: "Mening g'ayratli tanam", ru: "Моё непоседливое тело" }, glyph: "🧒", tone: "blossom", pages: 15, ageBand: "5-6", subjectId: "sub-body", minutes: 7 },
  { id: "bk-8", title: { en: "The Drum That Danced", uz: "Raqsga tushgan nog'ora", ru: "Барабан, который танцевал" }, glyph: "🥁", tone: "tangerine", pages: 13, ageBand: "3-4", subjectId: "sub-music", minutes: 6 },
];

export const videos: VideoItem[] = [
  { id: "vd-1", title: { en: "Colours Song", uz: "Ranglar qo'shig'i", ru: "Песенка о цветах" }, glyph: "🌈", tone: "blossom", seconds: 148, ageBand: "2-3", subjectId: "sub-colors", views: 18420 },
  { id: "vd-2", title: { en: "Counting Train", uz: "Sanoq poyezdi", ru: "Поезд-считалка" }, glyph: "🚂", tone: "sky", seconds: 205, ageBand: "3-4", subjectId: "sub-numbers", views: 22110 },
  { id: "vd-3", title: { en: "Jungle Sounds", uz: "O'rmon tovushlari", ru: "Звуки джунглей" }, glyph: "🌴", tone: "mint", seconds: 176, ageBand: "2-3", subjectId: "sub-animals", views: 31240 },
  { id: "vd-4", title: { en: "Alphabet Parade", uz: "Alifbo paradi", ru: "Парад алфавита" }, glyph: "🔤", tone: "grape", seconds: 240, ageBand: "4-5", subjectId: "sub-letters", views: 14980 },
  { id: "vd-5", title: { en: "Shape Detectives", uz: "Shakl izquvarlari", ru: "Сыщики фигур" }, glyph: "🔍", tone: "lagoon", seconds: 192, ageBand: "5-6", subjectId: "sub-shapes", views: 9870 },
  { id: "vd-6", title: { en: "Weather Watch", uz: "Ob-havo kuzatuvi", ru: "Наблюдаем за погодой" }, glyph: "⛅", tone: "sun", seconds: 163, ageBand: "4-5", subjectId: "sub-nature", views: 7640 },
];

export const activities: ActivityItem[] = [
  { id: "ac-1", title: { en: "Colour the Rainbow", uz: "Kamalakni bo'ya", ru: "Раскрась радугу" }, glyph: "🖍️", tone: "blossom", kind: "draw", minutes: 10, ageBand: "2-3" },
  { id: "ac-2", title: { en: "Trace the Letters", uz: "Harflarni chizib chiq", ru: "Обведи буквы" }, glyph: "✏️", tone: "grape", kind: "trace", minutes: 8, ageBand: "4-5" },
  { id: "ac-3", title: { en: "Sing the Number Song", uz: "Raqamlar qo'shig'ini kuyla", ru: "Спой песенку о числах" }, glyph: "🎤", tone: "sky", kind: "sing", minutes: 5, ageBand: "3-4" },
  { id: "ac-4", title: { en: "Animal Movements", uz: "Hayvonlar harakati", ru: "Движения животных" }, glyph: "🦘", tone: "mint", kind: "move", minutes: 7, ageBand: "2-3" },
  { id: "ac-5", title: { en: "Build a Shape Tower", uz: "Shakllardan minora qur", ru: "Построй башню из фигур" }, glyph: "🧱", tone: "sun", kind: "build", minutes: 12, ageBand: "5-6" },
  { id: "ac-6", title: { en: "Draw Your Family", uz: "Oilangni chiz", ru: "Нарисуй свою семью" }, glyph: "👨‍👩‍👧", tone: "coral", kind: "draw", minutes: 10, ageBand: "4-5" },
];

export function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
