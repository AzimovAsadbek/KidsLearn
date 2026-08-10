import type { Lesson, LessonProgress, LessonStep } from "@/types";

/* Step builders keep the lesson catalogue readable — each lesson describes its
   teaching arc, not the shape of every object. */

function intro(id: string, title: string, body: string, glyph: string): LessonStep {
  return { kind: "intro", id, title, body, glyph };
}
function teach(id: string, title: string, body: string, glyph: string, sayIt: string): LessonStep {
  return { kind: "teach", id, title, body, glyph, sayIt };
}
function quiz(
  id: string,
  title: string,
  prompt: string,
  options: Array<[string, string, string]>,
  correctId: string,
): LessonStep {
  return {
    kind: "quiz",
    id,
    title,
    prompt,
    options: options.map(([optId, label, glyph]) => ({ id: optId, label, glyph })),
    correctId,
  };
}
function celebrate(id: string, title: string, body: string, glyph: string): LessonStep {
  return { kind: "celebrate", id, title, body, glyph };
}

export const lessons: Lesson[] = [
  {
    id: "les-numbers-1",
    title: "Learn Numbers",
    subjectId: "sub-numbers",
    ageBand: "3-4",
    difficulty: "easy",
    durationMinutes: 8,
    glyph: "🔢",
    tone: "sky",
    status: "published",
    description: "Count from one to five with friendly objects.",
    xpReward: 20,
    starReward: 5,
    createdAt: "2025-11-02T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
    completions: 8421,
    steps: [
      intro("s1", "Let's count!", "Today we will count from 1 to 5. Ready?", "🔢"),
      teach("s2", "This is one", "One big red apple.", "🍎", "One"),
      teach("s3", "This is two", "Two yellow bananas.", "🍌", "Two"),
      teach("s4", "This is three", "Three orange carrots.", "🥕", "Three"),
      quiz(
        "s5",
        "How many?",
        "How many stars do you see? ⭐⭐",
        [
          ["a", "1", "1️⃣"],
          ["b", "2", "2️⃣"],
          ["c", "3", "3️⃣"],
          ["d", "4", "4️⃣"],
        ],
        "b",
      ),
      teach("s6", "This is four", "Four green pears.", "🍐", "Four"),
      teach("s7", "This is five", "Five purple grapes.", "🍇", "Five"),
      quiz(
        "s8",
        "Find the number",
        "Which one is the number five?",
        [
          ["a", "3", "3️⃣"],
          ["b", "5", "5️⃣"],
          ["c", "2", "2️⃣"],
          ["d", "4", "4️⃣"],
        ],
        "b",
      ),
      celebrate("s9", "You did it!", "You can count to five!", "🎉"),
    ],
  },
  {
    id: "les-animals-1",
    title: "Animals World",
    subjectId: "sub-animals",
    ageBand: "2-3",
    difficulty: "easy",
    durationMinutes: 10,
    glyph: "🐘",
    tone: "mint",
    status: "published",
    description: "Meet the animals and learn the sounds they make.",
    xpReward: 25,
    starReward: 5,
    createdAt: "2025-10-11T10:00:00.000Z",
    updatedAt: "2026-07-21T10:00:00.000Z",
    completions: 10233,
    steps: [
      intro("s1", "Animal friends", "Let's meet some animals today.", "🐘"),
      teach("s2", "The elephant", "The elephant is big and grey.", "🐘", "Elephant"),
      teach("s3", "The lion", "The lion roars very loudly.", "🦁", "Lion"),
      teach("s4", "The monkey", "The monkey loves bananas.", "🐵", "Monkey"),
      quiz(
        "s5",
        "Who roars?",
        "Which animal says ROAR?",
        [
          ["a", "Elephant", "🐘"],
          ["b", "Lion", "🦁"],
          ["c", "Monkey", "🐵"],
          ["d", "Rabbit", "🐰"],
        ],
        "b",
      ),
      teach("s6", "The rabbit", "The rabbit hops and hops.", "🐰", "Rabbit"),
      quiz(
        "s7",
        "Who hops?",
        "Which animal hops on two legs?",
        [
          ["a", "Rabbit", "🐰"],
          ["b", "Fish", "🐟"],
          ["c", "Lion", "🦁"],
          ["d", "Bird", "🐦"],
        ],
        "a",
      ),
      celebrate("s8", "Amazing!", "You know four animals now!", "🎉"),
    ],
  },
  {
    id: "les-colors-1",
    title: "Colors Around Us",
    subjectId: "sub-colors",
    ageBand: "2-3",
    difficulty: "easy",
    durationMinutes: 7,
    glyph: "🌈",
    tone: "blossom",
    status: "published",
    description: "Find red, blue, yellow and green in everyday things.",
    xpReward: 20,
    starReward: 5,
    createdAt: "2025-09-30T10:00:00.000Z",
    updatedAt: "2026-08-04T10:00:00.000Z",
    completions: 12980,
    steps: [
      intro("s1", "A world of colour", "Colours are everywhere. Let's find them!", "🌈"),
      teach("s2", "Red", "A red apple, a red heart.", "🔴", "Red"),
      teach("s3", "Blue", "The blue sky and the blue sea.", "🔵", "Blue"),
      quiz(
        "s4",
        "Find red",
        "Which one is red?",
        [
          ["a", "Blue", "🔵"],
          ["b", "Red", "🔴"],
          ["c", "Green", "🟢"],
          ["d", "Yellow", "🟡"],
        ],
        "b",
      ),
      teach("s5", "Yellow", "The sun is bright and yellow.", "🟡", "Yellow"),
      teach("s6", "Green", "Grass and leaves are green.", "🟢", "Green"),
      quiz(
        "s7",
        "Find green",
        "Which one is green?",
        [
          ["a", "Green", "🟢"],
          ["b", "Yellow", "🟡"],
          ["c", "Red", "🔴"],
          ["d", "Blue", "🔵"],
        ],
        "a",
      ),
      celebrate("s8", "Beautiful!", "You found all four colours!", "🎉"),
    ],
  },
  {
    id: "les-letters-1",
    title: "Alphabet",
    subjectId: "sub-letters",
    ageBand: "4-5",
    difficulty: "medium",
    durationMinutes: 12,
    glyph: "🔤",
    tone: "grape",
    status: "published",
    description: "The first letters and the sounds they make.",
    xpReward: 30,
    starReward: 6,
    createdAt: "2025-08-14T10:00:00.000Z",
    updatedAt: "2026-08-06T10:00:00.000Z",
    completions: 6120,
    steps: [
      intro("s1", "Letter time", "Letters make words. Let's learn A, B and C.", "🔤"),
      teach("s2", "The letter A", "A is for Apple.", "🅰️", "A"),
      teach("s3", "The letter B", "B is for Ball.", "🅱️", "B"),
      quiz(
        "s4",
        "Which is A?",
        "Point to the letter A.",
        [
          ["a", "B", "🅱️"],
          ["b", "A", "🅰️"],
          ["c", "C", "🇨"],
          ["d", "D", "🇩"],
        ],
        "b",
      ),
      teach("s5", "The letter C", "C is for Cat.", "🇨", "C"),
      quiz(
        "s6",
        "B is for…",
        "Which picture starts with B?",
        [
          ["a", "Cat", "🐱"],
          ["b", "Ball", "⚽"],
          ["c", "Apple", "🍎"],
          ["d", "Dog", "🐶"],
        ],
        "b",
      ),
      celebrate("s7", "Wonderful!", "A, B and C — you did it!", "🎉"),
    ],
  },
  {
    id: "les-shapes-1",
    title: "Shapes & Patterns",
    subjectId: "sub-shapes",
    ageBand: "3-4",
    difficulty: "medium",
    durationMinutes: 9,
    glyph: "🔷",
    tone: "lagoon",
    status: "published",
    description: "Circle, square and triangle — and how patterns repeat.",
    xpReward: 25,
    starReward: 5,
    createdAt: "2025-12-01T10:00:00.000Z",
    updatedAt: "2026-07-11T10:00:00.000Z",
    completions: 4310,
    steps: [
      intro("s1", "Shape hunt", "Shapes are everywhere. Let's find them.", "🔷"),
      teach("s2", "Circle", "A circle is perfectly round.", "⭕", "Circle"),
      teach("s3", "Square", "A square has four equal sides.", "🟦", "Square"),
      teach("s4", "Triangle", "A triangle has three sides.", "🔺", "Triangle"),
      quiz(
        "s5",
        "Find the circle",
        "Which shape is round?",
        [
          ["a", "Square", "🟦"],
          ["b", "Triangle", "🔺"],
          ["c", "Circle", "⭕"],
          ["d", "Star", "⭐"],
        ],
        "c",
      ),
      celebrate("s6", "Great job!", "You know three shapes!", "🎉"),
    ],
  },
  {
    id: "les-nature-1",
    title: "Weather Today",
    subjectId: "sub-nature",
    ageBand: "4-5",
    difficulty: "easy",
    durationMinutes: 8,
    glyph: "⛅",
    tone: "sun",
    status: "published",
    description: "Sunny, rainy, windy and snowy days.",
    xpReward: 20,
    starReward: 4,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-06-20T10:00:00.000Z",
    completions: 2870,
    steps: [
      intro("s1", "What's the weather?", "Look outside — what can you see?", "⛅"),
      teach("s2", "Sunny", "The sun is shining and it is warm.", "☀️", "Sunny"),
      teach("s3", "Rainy", "Rain falls from the clouds.", "🌧️", "Rainy"),
      quiz(
        "s4",
        "Which is rainy?",
        "Which picture shows rain?",
        [
          ["a", "Sunny", "☀️"],
          ["b", "Rainy", "🌧️"],
          ["c", "Snowy", "❄️"],
          ["d", "Windy", "🌬️"],
        ],
        "b",
      ),
      celebrate("s5", "Nice work!", "You can name the weather!", "🎉"),
    ],
  },
  {
    id: "les-music-1",
    title: "Clap the Rhythm",
    subjectId: "sub-music",
    ageBand: "3-4",
    difficulty: "easy",
    durationMinutes: 6,
    glyph: "🥁",
    tone: "tangerine",
    status: "review",
    description: "Listen, then clap the pattern back.",
    xpReward: 18,
    starReward: 4,
    createdAt: "2026-05-04T10:00:00.000Z",
    updatedAt: "2026-08-09T10:00:00.000Z",
    completions: 940,
    steps: [
      intro("s1", "Music time", "Listen carefully and clap along.", "🥁"),
      teach("s2", "Slow beat", "Clap… clap… clap…", "👏", "Clap"),
      celebrate("s3", "You've got rhythm!", "Beautiful clapping!", "🎉"),
    ],
  },
  {
    id: "les-body-1",
    title: "My Five Senses",
    subjectId: "sub-body",
    ageBand: "5-6",
    difficulty: "medium",
    durationMinutes: 11,
    glyph: "👀",
    tone: "coral",
    status: "draft",
    description: "See, hear, smell, taste and touch.",
    xpReward: 28,
    starReward: 6,
    createdAt: "2026-07-30T10:00:00.000Z",
    updatedAt: "2026-08-10T06:00:00.000Z",
    completions: 0,
    steps: [
      intro("s1", "Five senses", "Your body has five amazing senses.", "👀"),
      teach("s2", "Seeing", "We see with our eyes.", "👀", "See"),
      celebrate("s3", "Well done!", "You explored your senses!", "🎉"),
    ],
  },
  {
    id: "les-numbers-2",
    title: "Counting to Ten",
    subjectId: "sub-numbers",
    ageBand: "4-5",
    difficulty: "medium",
    durationMinutes: 10,
    glyph: "🔟",
    tone: "sky",
    status: "published",
    description: "Add five more and reach ten.",
    xpReward: 30,
    starReward: 6,
    createdAt: "2026-02-10T10:00:00.000Z",
    updatedAt: "2026-07-02T10:00:00.000Z",
    completions: 5410,
    steps: [
      intro("s1", "Up to ten", "You know 1 to 5. Now let's go to 10!", "🔟"),
      teach("s2", "Six and seven", "Six ducks, seven flowers.", "🦆", "Six"),
      quiz(
        "s3",
        "What comes after 7?",
        "Which number comes next?",
        [
          ["a", "6", "6️⃣"],
          ["b", "8", "8️⃣"],
          ["c", "10", "🔟"],
          ["d", "9", "9️⃣"],
        ],
        "b",
      ),
      celebrate("s4", "Fantastic!", "You counted all the way to ten!", "🎉"),
    ],
  },
  {
    id: "les-colors-2",
    title: "Mixing Colors",
    subjectId: "sub-colors",
    ageBand: "5-6",
    difficulty: "hard",
    durationMinutes: 12,
    glyph: "🖌️",
    tone: "blossom",
    status: "published",
    description: "Red and yellow make orange — try it yourself.",
    xpReward: 35,
    starReward: 7,
    createdAt: "2026-03-22T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    completions: 3120,
    steps: [
      intro("s1", "Colour magic", "What happens when colours meet?", "🖌️"),
      teach("s2", "Red + yellow", "Red and yellow make orange!", "🟠", "Orange"),
      quiz(
        "s3",
        "Blue + yellow?",
        "What colour do blue and yellow make?",
        [
          ["a", "Purple", "🟣"],
          ["b", "Green", "🟢"],
          ["c", "Orange", "🟠"],
          ["d", "Pink", "🩷"],
        ],
        "b",
      ),
      celebrate("s4", "You're an artist!", "You mixed new colours!", "🎉"),
    ],
  },
];

export const lessonById = new Map(lessons.map((l) => [l.id, l]));

export function getLesson(id: string): Lesson | undefined {
  return lessonById.get(id);
}

export const publishedLessons = lessons.filter((l) => l.status === "published");

/** Per-child progress against the "continue learning" rail. */
export const lessonProgress: LessonProgress[] = [
  { lessonId: "les-numbers-1", childId: "ch-ali", percent: 75, starsEarned: 3 },
  { lessonId: "les-animals-1", childId: "ch-ali", percent: 60, starsEarned: 3 },
  { lessonId: "les-colors-1", childId: "ch-ali", percent: 90, starsEarned: 4 },
  { lessonId: "les-letters-1", childId: "ch-ali", percent: 40, starsEarned: 2 },
  { lessonId: "les-shapes-1", childId: "ch-ali", percent: 25, starsEarned: 1 },
  { lessonId: "les-colors-1", childId: "ch-zarina", percent: 100, completedAt: "2026-08-09T15:00:00.000Z", starsEarned: 5 },
  { lessonId: "les-animals-1", childId: "ch-zarina", percent: 55, starsEarned: 2 },
  { lessonId: "les-numbers-1", childId: "ch-zarina", percent: 30, starsEarned: 1 },
  { lessonId: "les-numbers-2", childId: "ch-omar", percent: 85, starsEarned: 4 },
  { lessonId: "les-letters-1", childId: "ch-omar", percent: 95, starsEarned: 5 },
  { lessonId: "les-colors-2", childId: "ch-omar", percent: 45, starsEarned: 2 },
  { lessonId: "les-shapes-1", childId: "ch-omar", percent: 70, starsEarned: 3 },
];

export function progressFor(childId: string, lessonId: string): number {
  return lessonProgress.find((p) => p.childId === childId && p.lessonId === lessonId)?.percent ?? 0;
}

export function continueLearningFor(childId: string): Array<{ lesson: Lesson; percent: number }> {
  return lessonProgress
    .filter((p) => p.childId === childId && p.percent < 100)
    .map((p) => ({ lesson: lessonById.get(p.lessonId), percent: p.percent }))
    .filter((entry): entry is { lesson: Lesson; percent: number } => Boolean(entry.lesson))
    .sort((a, b) => b.percent - a.percent);
}
