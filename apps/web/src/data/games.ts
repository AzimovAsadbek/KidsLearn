import type { Game, GameOption, GameRound, GameType, Tone } from "@/types";
import { seededShuffle } from "@/lib/utils";

export const games: Game[] = [
  {
    id: "gam-color-match",
    type: "color-match",
    title: "Color Match",
    subjectId: "sub-colors",
    ageBand: "2-3",
    difficulty: "easy",
    glyph: "🎨",
    tone: "blossom",
    status: "published",
    description: "Tap the colour we ask for before the timer runs out.",
    plays: 24310,
    completionRate: 92,
    averageScore: 8.4,
    updatedAt: "2026-08-03T10:00:00.000Z",
  },
  {
    id: "gam-animal-sounds",
    type: "animal-sounds",
    title: "Animal Sounds",
    subjectId: "sub-animals",
    ageBand: "2-3",
    difficulty: "easy",
    glyph: "🐶",
    tone: "tangerine",
    status: "published",
    description: "Listen to the sound, then pick the animal that makes it.",
    plays: 31890,
    completionRate: 88,
    averageScore: 7.9,
    updatedAt: "2026-08-06T10:00:00.000Z",
  },
  {
    id: "gam-letter-match",
    type: "letter-match",
    title: "Letter Match",
    subjectId: "sub-letters",
    ageBand: "4-5",
    difficulty: "medium",
    glyph: "🅰️",
    tone: "coral",
    status: "published",
    description: "Find the letter that matches the one we show.",
    plays: 18240,
    completionRate: 81,
    averageScore: 7.2,
    updatedAt: "2026-07-29T10:00:00.000Z",
  },
  {
    id: "gam-number-game",
    type: "number-match",
    title: "Number Game",
    subjectId: "sub-numbers",
    ageBand: "3-4",
    difficulty: "medium",
    glyph: "🔢",
    tone: "sky",
    status: "published",
    description: "Count the objects and choose the right number.",
    plays: 21470,
    completionRate: 85,
    averageScore: 7.6,
    updatedAt: "2026-08-08T10:00:00.000Z",
  },
  {
    id: "gam-puzzle",
    type: "puzzle",
    title: "Puzzle",
    subjectId: "sub-shapes",
    ageBand: "5-6",
    difficulty: "hard",
    glyph: "🧩",
    tone: "sun",
    status: "published",
    description: "Drag every piece back into the right place.",
    plays: 12630,
    completionRate: 71,
    averageScore: 6.4,
    updatedAt: "2026-07-18T10:00:00.000Z",
  },
  {
    id: "gam-memory",
    type: "memory",
    title: "Memory Game",
    subjectId: "sub-shapes",
    ageBand: "4-5",
    difficulty: "medium",
    glyph: "🃏",
    tone: "grape",
    status: "published",
    description: "Flip the cards and remember where the pairs are.",
    plays: 27510,
    completionRate: 79,
    averageScore: 7.1,
    updatedAt: "2026-08-05T10:00:00.000Z",
  },
];

export const gameById = new Map(games.map((g) => [g.id, g]));

export function getGame(id: string): Game | undefined {
  return gameById.get(id);
}

/* ============================================================================
   Round generation
   Content is data, not markup: one engine renders every game type, and each
   type only has to describe its prompt and its options.
   ========================================================================== */

const COLORS: Array<{ id: string; label: string; glyph: string; tone: Tone }> = [
  { id: "red", label: "Red", glyph: "🔴", tone: "coral" },
  { id: "green", label: "Green", glyph: "🟢", tone: "mint" },
  { id: "blue", label: "Blue", glyph: "🔵", tone: "sky" },
  { id: "yellow", label: "Yellow", glyph: "🟡", tone: "sun" },
  { id: "purple", label: "Purple", glyph: "🟣", tone: "grape" },
  { id: "orange", label: "Orange", glyph: "🟠", tone: "tangerine" },
];

const ANIMALS: Array<{ id: string; label: string; glyph: string; sound: string }> = [
  { id: "cow", label: "Cow", glyph: "🐄", sound: "Moo!" },
  { id: "dog", label: "Dog", glyph: "🐶", sound: "Woof woof!" },
  { id: "cat", label: "Cat", glyph: "🐱", sound: "Meow!" },
  { id: "duck", label: "Duck", glyph: "🦆", sound: "Quack!" },
  { id: "lion", label: "Lion", glyph: "🦁", sound: "Roar!" },
  { id: "sheep", label: "Sheep", glyph: "🐑", sound: "Baa!" },
  { id: "frog", label: "Frog", glyph: "🐸", sound: "Ribbit!" },
  { id: "bee", label: "Bee", glyph: "🐝", sound: "Bzzzz!" },
];

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "K", "M", "O", "S"];

const COUNTABLES = ["🍎", "⭐", "🎈", "🐟", "🌸", "🍪"];

const PUZZLE_SCENES: Array<{ id: string; title: string; tiles: string[]; tone: Tone }> = [
  { id: "rocket", title: "Rocket", tiles: ["🌌", "⭐", "🌌", "☁️", "🚀", "☁️", "🌍", "🔥", "🌍"], tone: "grape" },
  { id: "garden", title: "Garden", tiles: ["☀️", "☁️", "🦋", "🌳", "🌷", "🌳", "🌱", "🐞", "🌱"], tone: "mint" },
  { id: "ocean", title: "Ocean", tiles: ["🌊", "⛵", "🌊", "🐠", "🐙", "🐠", "🪸", "🦀", "🪸"], tone: "sky" },
];

const MEMORY_FACES = ["🐻", "🦊", "🐼", "🐸", "🐧", "🦄", "🐯", "🐨", "🐷", "🐵"];

function pickDistinct<T>(pool: readonly T[], count: number, seed: number): T[] {
  return seededShuffle(pool, seed).slice(0, count);
}

function optionCountFor(difficulty: Game["difficulty"]): number {
  return difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 6;
}

export const ROUNDS_PER_GAME = 6;

/**
 * Answers are drawn by walking a shuffled pool rather than re-sampling each
 * round, so a game never asks for the same thing twice in a row (or at all,
 * while the pool is larger than the round count).
 */
function answerAt<T>(pool: readonly T[], roundIndex: number, seed: number): T {
  return seededShuffle(pool, seed)[roundIndex % pool.length];
}

/** Build a deterministic set of rounds. Same seed → same game, so replays are fair. */
export function buildRounds(type: GameType, difficulty: Game["difficulty"], seed: number): GameRound[] {
  const optionCount = optionCountFor(difficulty);

  return Array.from({ length: ROUNDS_PER_GAME }, (_, roundIndex) => {
    const roundSeed = seed + roundIndex * 977;
    const id = `r${roundIndex}`;

    switch (type) {
      case "color-match": {
        const answer = answerAt(COLORS, roundIndex, seed);
        const distractors = pickDistinct(
          COLORS.filter((c) => c.id !== answer.id),
          Math.min(optionCount, COLORS.length) - 1,
          roundSeed,
        );
        const options = seededShuffle([answer, ...distractors], roundSeed + 5);
        return {
          id,
          prompt: answer.label,
          promptGlyph: "🎨",
          promptTone: answer.tone,
          options: options.map<GameOption>((c) => ({ id: c.id, label: c.label, glyph: c.glyph, tone: c.tone })),
          correctId: answer.id,
        } satisfies GameRound;
      }

      case "animal-sounds": {
        const answer = answerAt(ANIMALS, roundIndex, seed);
        const distractors = pickDistinct(
          ANIMALS.filter((a) => a.id !== answer.id),
          Math.min(optionCount, ANIMALS.length) - 1,
          roundSeed,
        );
        const options = seededShuffle([answer, ...distractors], roundSeed + 5);
        return {
          id,
          prompt: answer.sound,
          promptGlyph: "🔊",
          promptTone: "tangerine",
          options: options.map<GameOption>((a) => ({ id: a.id, label: a.label, glyph: a.glyph })),
          correctId: answer.id,
        } satisfies GameRound;
      }

      case "letter-match": {
        const answer = answerAt(LETTERS, roundIndex, seed);
        const distractors = pickDistinct(
          LETTERS.filter((letter) => letter !== answer),
          Math.min(optionCount, LETTERS.length) - 1,
          roundSeed,
        );
        const options = seededShuffle([answer, ...distractors], roundSeed + 5);
        return {
          id,
          prompt: answer,
          promptGlyph: answer,
          promptTone: "coral",
          options: options.map<GameOption>((letter) => ({ id: letter, label: letter, glyph: letter })),
          correctId: answer,
        } satisfies GameRound;
      }

      case "number-match": {
        const icon = COUNTABLES[roundIndex % COUNTABLES.length];
        const numbers = Array.from({ length: 9 }, (_, i) => i + 1);
        const answer = answerAt(numbers, roundIndex, seed);
        const distractors = pickDistinct(
          numbers.filter((n) => n !== answer),
          optionCount - 1,
          roundSeed,
        );
        const options = seededShuffle([answer, ...distractors], roundSeed + 13);
        return {
          id,
          prompt: icon.repeat(answer),
          promptGlyph: icon,
          promptTone: "sky",
          options: options.map<GameOption>((n) => ({ id: String(n), label: String(n), glyph: String(n) })),
          correctId: String(answer),
        } satisfies GameRound;
      }

      // Puzzle and memory drive their own boards; they never consume rounds.
      default:
        return { id, prompt: "", options: [], correctId: "" } satisfies GameRound;
    }
  });
}

/** Memory board: `pairs` distinct faces, each duplicated, then shuffled. */
export function buildMemoryDeck(pairs: number, seed: number): GameOption[] {
  const faces = pickDistinct(MEMORY_FACES, pairs, seed);
  const deck = faces.flatMap<GameOption>((face, index) => [
    { id: `${face}-a-${index}`, label: face, glyph: face, matchKey: face },
    { id: `${face}-b-${index}`, label: face, glyph: face, matchKey: face },
  ]);
  return seededShuffle(deck, seed + 7);
}

export interface PuzzleBoard {
  id: string;
  title: string;
  tone: Tone;
  /** Tiles in solved order; index is the slot each tile belongs to. */
  solution: string[];
  /** The same tiles, shuffled, as the tray the child drags from. */
  tray: Array<{ id: string; glyph: string; slot: number }>;
}

export function buildPuzzle(seed: number): PuzzleBoard {
  const scene = PUZZLE_SCENES[seed % PUZZLE_SCENES.length];
  const pieces = scene.tiles.map((glyph, slot) => ({ id: `p${slot}`, glyph, slot }));
  return {
    id: scene.id,
    title: scene.title,
    tone: scene.tone,
    solution: scene.tiles,
    tray: seededShuffle(pieces, seed + 31),
  };
}

/** Human-readable prompt sentence per game type, used by the engine header. */
export const gamePromptKey: Record<GameType, string> = {
  "color-match": "game.findColor",
  "animal-sounds": "game.whichAnimal",
  "letter-match": "game.findLetter",
  "number-match": "game.findNumber",
  puzzle: "game.buildPicture",
  memory: "game.matchPairs",
};
