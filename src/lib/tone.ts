/**
 * Tones are the product's colour vocabulary. A feature never picks a raw hue —
 * it picks a tone, and the tone decides the tint, ink, ring and gradient so that
 * every subject badge, stat card and lesson tile stays in the same family.
 *
 * Class strings are static because Tailwind cannot see interpolated names.
 */
export const TONES = [
  "brand",
  "sky",
  "mint",
  "sun",
  "tangerine",
  "blossom",
  "coral",
  "lagoon",
  "grape",
] as const;

export type Tone = (typeof TONES)[number];

interface ToneStyle {
  /** Soft tinted surface — stat cards, icon chips, empty states. */
  soft: string;
  /** Readable ink on the soft surface (AA at 14px). */
  ink: string;
  /** Saturated fill for progress bars, dots and solid badges. */
  solid: string;
  /** Border used when a soft surface needs definition. */
  border: string;
  /** Decorative gradient for hero tiles and illustration backdrops. */
  gradient: string;
  /** Raw hex core, for SVG charts that cannot use utility classes. */
  hex: string;
  /** Raw hex tint, for SVG area fills. */
  hexSoft: string;
}

export const toneStyles: Record<Tone, ToneStyle> = {
  brand: {
    soft: "bg-brand-50 dark:bg-brand-500/15",
    ink: "text-brand-700 dark:text-brand-300",
    solid: "bg-brand-500",
    border: "border-brand-200 dark:border-brand-500/30",
    gradient: "bg-gradient-to-br from-brand-400 to-brand-600",
    hex: "#7c4dff",
    hexSoft: "#ebe5ff",
  },
  sky: {
    soft: "bg-sky-soft dark:bg-sky-core/15",
    ink: "text-sky-deep dark:text-sky-core",
    solid: "bg-sky-core",
    border: "border-sky-core/25",
    gradient: "bg-gradient-to-br from-sky-core to-sky-deep",
    hex: "#3b8aff",
    hexSoft: "#e6f1ff",
  },
  mint: {
    soft: "bg-mint-soft dark:bg-mint-core/15",
    ink: "text-mint-deep dark:text-mint-core",
    solid: "bg-mint-core",
    border: "border-mint-core/25",
    gradient: "bg-gradient-to-br from-mint-core to-mint-deep",
    hex: "#16c47f",
    hexSoft: "#e0f8ee",
  },
  sun: {
    soft: "bg-sun-soft dark:bg-sun-core/15",
    ink: "text-sun-deep dark:text-sun-core",
    solid: "bg-sun-core",
    border: "border-sun-core/30",
    gradient: "bg-gradient-to-br from-sun-core to-tangerine-core",
    hex: "#ffbe28",
    hexSoft: "#fff4d6",
  },
  tangerine: {
    soft: "bg-tangerine-soft dark:bg-tangerine-core/15",
    ink: "text-tangerine-deep dark:text-tangerine-core",
    solid: "bg-tangerine-core",
    border: "border-tangerine-core/25",
    gradient: "bg-gradient-to-br from-tangerine-core to-tangerine-deep",
    hex: "#ff8a3d",
    hexSoft: "#ffece0",
  },
  blossom: {
    soft: "bg-blossom-soft dark:bg-blossom-core/15",
    ink: "text-blossom-deep dark:text-blossom-core",
    solid: "bg-blossom-core",
    border: "border-blossom-core/25",
    gradient: "bg-gradient-to-br from-blossom-core to-blossom-deep",
    hex: "#ff5f9e",
    hexSoft: "#ffe7f1",
  },
  coral: {
    soft: "bg-coral-soft dark:bg-coral-core/15",
    ink: "text-coral-deep dark:text-coral-core",
    solid: "bg-coral-core",
    border: "border-coral-core/25",
    gradient: "bg-gradient-to-br from-coral-core to-coral-deep",
    hex: "#f4515c",
    hexSoft: "#ffe8e9",
  },
  lagoon: {
    soft: "bg-lagoon-soft dark:bg-lagoon-core/15",
    ink: "text-lagoon-deep dark:text-lagoon-core",
    solid: "bg-lagoon-core",
    border: "border-lagoon-core/25",
    gradient: "bg-gradient-to-br from-lagoon-core to-lagoon-deep",
    hex: "#1fc4d6",
    hexSoft: "#e0f7fa",
  },
  grape: {
    soft: "bg-grape-soft dark:bg-grape-core/15",
    ink: "text-grape-deep dark:text-grape-core",
    solid: "bg-grape-core",
    border: "border-grape-core/25",
    gradient: "bg-gradient-to-br from-grape-core to-grape-deep",
    hex: "#9257ff",
    hexSoft: "#f0e9ff",
  },
};

/** Ordered palette for multi-series charts — hues are spaced for distinguishability. */
export const chartSeriesTones: Tone[] = ["brand", "sky", "mint", "sun", "blossom", "lagoon"];

/** Stable tone for an arbitrary key (subject slug, category id, avatar seed). */
export function toneFromKey(key: string): Tone {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}
