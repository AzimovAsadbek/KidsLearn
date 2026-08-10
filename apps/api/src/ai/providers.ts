import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AgeCategory } from "@kidslearn/types";
import type { AiConfig } from "../common/config/configuration";

/* ============================================================================
   Provider contracts
   ========================================================================== */

export interface ImageGenerationInput {
  prompt: string;
  style?: string;
  ageCategory?: AgeCategory;
}

export interface GeneratedImage {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

export interface ImageGenerationProvider {
  readonly name: string;
  readonly configured: boolean;
  generate(input: ImageGenerationInput): Promise<GeneratedImage>;
}

export interface RecommendationInput {
  childName: string;
  ageCategory: AgeCategory;
  weakSubjects: Array<{ name: string; score: number }>;
  strongSubjects: Array<{ name: string; score: number }>;
  currentStreak: number;
  recentAccuracy: number;
  candidateLesson: { id: string; slug: string; title: string; subjectName: string; minutes: number } | null;
}

export interface GeneratedRecommendation {
  headline: string;
  rationale: string;
  confidence: number;
  minutes: number;
}

export interface RecommendationProvider {
  readonly name: string;
  readonly configured: boolean;
  generate(input: RecommendationInput): Promise<GeneratedRecommendation>;
}

/* ============================================================================
   Image generation
   ========================================================================== */

/**
 * Used when no image model is configured.
 *
 * It does not pretend to have called a model: it produces a clearly-labelled
 * SVG placeholder, the job is stored with status PREVIEW_ONLY, and the admin UI
 * says the generator is in preview mode. The rest of the pipeline — review,
 * approval, media library — is the real one, so wiring a provider later changes
 * only this class.
 */
@Injectable()
export class PreviewImageProvider implements ImageGenerationProvider {
  readonly name = "preview";
  readonly configured = false;

  async generate(input: ImageGenerationInput): Promise<GeneratedImage> {
    const glyph = pickGlyph(input.prompt);
    const tone = pickTone(input.prompt);
    const safePrompt = escapeXml(input.prompt.slice(0, 90));

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${tone.from}"/>
      <stop offset="100%" stop-color="${tone.to}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="48" fill="url(#bg)"/>
  <text x="256" y="285" font-size="190" text-anchor="middle" dominant-baseline="middle">${glyph}</text>
  <text x="256" y="404" font-size="19" text-anchor="middle" fill="#14152b" opacity="0.72"
        font-family="system-ui, sans-serif">${safePrompt}</text>
  <text x="256" y="440" font-size="15" text-anchor="middle" fill="#14152b" opacity="0.55"
        font-family="system-ui, sans-serif">Preview placeholder — no image model configured</text>
</svg>`;

    return {
      buffer: Buffer.from(svg, "utf8"),
      mimeType: "image/svg+xml",
      filename: `preview-${Date.now()}.svg`,
    };
  }
}

/**
 * OpenAI image generation. Only selected when both `AI_IMAGE_PROVIDER=openai`
 * and an API key are present; otherwise the factory falls back to preview mode
 * rather than failing at request time.
 */
@Injectable()
export class OpenAiImageProvider implements ImageGenerationProvider {
  readonly name = "openai";
  readonly configured = true;
  private readonly logger = new Logger(OpenAiImageProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generate(input: ImageGenerationInput): Promise<GeneratedImage> {
    const guardedPrompt = [
      input.prompt,
      input.style ? `Style: ${input.style}.` : "",
      "Audience: young children. Friendly, simple, brightly coloured, no text, no people's faces.",
    ]
      .filter(Boolean)
      .join(" ");

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: this.model, prompt: guardedPrompt, size: "1024x1024", n: 1 }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.error(`Image generation failed (${response.status})`);
      // The upstream failure is surfaced as a failure, never as a fake success.
      throw new Error(`Image provider returned ${response.status}: ${detail.slice(0, 200)}`);
    }

    const payload = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const first = payload.data?.[0];

    if (first?.b64_json) {
      return {
        buffer: Buffer.from(first.b64_json, "base64"),
        mimeType: "image/png",
        filename: `ai-${Date.now()}.png`,
      };
    }

    if (first?.url) {
      const image = await fetch(first.url);
      if (!image.ok) throw new Error(`Could not download the generated image (${image.status})`);
      return {
        buffer: Buffer.from(await image.arrayBuffer()),
        mimeType: "image/png",
        filename: `ai-${Date.now()}.png`,
      };
    }

    throw new Error("Image provider returned no image");
  }
}

/* ============================================================================
   Recommendations
   ========================================================================== */

/**
 * The default recommendation engine.
 *
 * It is deterministic, free, instant and always available — the product never
 * depends on an AI API being reachable to tell a parent what to do next.
 */
@Injectable()
export class RuleBasedRecommendationProvider implements RecommendationProvider {
  readonly name = "rule-based";
  readonly configured = true;

  async generate(input: RecommendationInput): Promise<GeneratedRecommendation> {
    const weakest = input.weakSubjects[0];
    const strongest = input.strongSubjects[0];
    const lesson = input.candidateLesson;
    const minutes = lesson?.minutes ?? 10;

    if (weakest && weakest.score < 70) {
      return {
        headline: lesson
          ? `Practise ${weakest.name.toLowerCase()} with "${lesson.title}"`
          : `Practise ${weakest.name.toLowerCase()} for ${minutes} minutes today`,
        rationale:
          `${input.childName} answers ${weakest.name.toLowerCase()} questions correctly ${weakest.score}% of the time` +
          (strongest ? `, against ${strongest.score}% in ${strongest.name.toLowerCase()}` : "") +
          `. A short focused session is the fastest way to close that gap.`,
        confidence: Math.min(94, 70 + Math.round((70 - weakest.score) / 2)),
        minutes,
      };
    }

    if (input.currentStreak === 0) {
      return {
        headline: `Start a new streak with ${minutes} minutes today`,
        rationale: `${input.childName} hasn't learned in the last day or two. A single short lesson restarts the streak and brings back the daily habit.`,
        confidence: 76,
        minutes,
      };
    }

    if (input.recentAccuracy >= 90 && lesson) {
      return {
        headline: `Move on to "${lesson.title}"`,
        rationale: `${input.childName} is answering ${input.recentAccuracy}% correctly, which means the current material is no longer a challenge. ${lesson.subjectName} is the natural next step for this age band.`,
        confidence: 88,
        minutes,
      };
    }

    return {
      headline: lesson ? `Keep going with "${lesson.title}"` : `Keep the ${input.currentStreak}-day streak going`,
      rationale: `${input.childName} is making steady progress at ${input.recentAccuracy}% accuracy. Consistency matters more than volume at this age — another short session keeps the habit intact.`,
      confidence: 72,
      minutes,
    };
  }
}

/* ============================================================================
   Factory
   ========================================================================== */

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);
  readonly image: ImageGenerationProvider;
  readonly recommendation: RecommendationProvider;

  constructor(config: ConfigService) {
    const ai = config.getOrThrow<AiConfig>("ai");

    if (ai.imageProvider === "openai" && ai.imageApiKey) {
      this.image = new OpenAiImageProvider(ai.imageApiKey, ai.imageModel);
      this.logger.log(`Image generation provider: openai (${ai.imageModel})`);
    } else {
      this.image = new PreviewImageProvider();
      if (ai.imageProvider !== "preview") {
        this.logger.warn(
          `AI_IMAGE_PROVIDER is "${ai.imageProvider}" but no API key is set — staying in preview mode`,
        );
      } else {
        this.logger.log("Image generation provider: preview (no model configured)");
      }
    }

    // Only the rule-based engine is implemented today; an LLM provider would
    // slot in here without changing any caller.
    this.recommendation = new RuleBasedRecommendationProvider();
    this.logger.log("Recommendation provider: rule-based");
  }
}

/* --- helpers -------------------------------------------------------------- */

const GLYPHS: Array<[RegExp, string]> = [
  [/apple|fruit/i, "🍎"],
  [/lion|jungle/i, "🦁"],
  [/dog|puppy/i, "🐶"],
  [/cat|kitten/i, "🐱"],
  [/fish|ocean|whale/i, "🐋"],
  [/bird/i, "🐦"],
  [/sun|sunny/i, "☀️"],
  [/rain|cloud/i, "🌧️"],
  [/tree|forest|plant/i, "🌳"],
  [/flower/i, "🌸"],
  [/number|count/i, "🔢"],
  [/letter|alphabet/i, "🔤"],
  [/shape|circle|square/i, "🔷"],
  [/star/i, "⭐"],
  [/car|truck/i, "🚗"],
  [/house|home/i, "🏠"],
];

function pickGlyph(prompt: string): string {
  return GLYPHS.find(([pattern]) => pattern.test(prompt))?.[1] ?? "🎨";
}

const TONES = [
  { from: "#ebe5ff", to: "#d8ccff" },
  { from: "#e0f8ee", to: "#c6f0df" },
  { from: "#fff4d6", to: "#ffe7ad" },
  { from: "#ffe7f1", to: "#ffd0e3" },
  { from: "#e6f1ff", to: "#cfe3ff" },
];

function pickTone(prompt: string) {
  let hash = 0;
  for (let i = 0; i < prompt.length; i += 1) hash = (hash * 31 + prompt.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
