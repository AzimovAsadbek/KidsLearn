/**
 * Development seed.
 *
 * Produces a platform that looks alive the moment it boots: three families,
 * children across all three age bands, a full curriculum, all six game types
 * with real questions, achievement definitions, and ninety days of plausible
 * learning history so every chart, streak and leaderboard has something honest
 * to show.
 *
 * Deterministic: the same seed always produces the same database, so a
 * screenshot or a failing test can be reproduced exactly.
 *
 *   pnpm db:seed
 */
import { PrismaClient, Locale, type Prisma } from "../packages/database/generated/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

/* --- deterministic randomness -------------------------------------------- */

let rngState = 20260810;
function random(): number {
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return ((rngState >>> 0) % 100000) / 100000;
}
function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

const ARGON: argon2.Options = { type: argon2.argon2id, memoryCost: 19 * 1024, timeCost: 2, parallelism: 1 };

/** LOCAL DEVELOPMENT ONLY — these are documented in the README. */
const DEV_PASSWORD = "kidslearn2026";

const t = (uz: string, ru: string, en: string) => [
  { locale: Locale.UZ, value: uz },
  { locale: Locale.RU, value: ru },
  { locale: Locale.EN, value: en },
];

/* ========================================================================== */

async function main() {
  console.log("Seeding KidsLearn…");

  // Wipe in dependency order so the seed is re-runnable.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "audit_logs","push_subscriptions","notifications","ai_reviews","ai_jobs",
      "certificates","leaderboard_entries","recommendations","child_rewards","reward_translations","rewards",
      "child_achievements","achievement_translations","achievements","activities","daily_stats","subject_stats",
      "progress","game_attempt_answers","game_attempts","game_sessions",
      "game_question_option_translations","game_question_options","game_question_translations","game_questions",
      "game_translations","games","lesson_progress","lesson_question_option_translations","lesson_question_options",
      "lesson_question_translations","lesson_questions","lesson_block_translations","lesson_blocks",
      "lesson_translations","lessons","category_translations","categories","subject_translations","subjects",
      "children","parent_profiles","password_reset_tokens","refresh_tokens","media","users","feature_flags"
    RESTART IDENTITY CASCADE;
  `);

  const passwordHash = await argon2.hash(DEV_PASSWORD, ARGON);

  /* --- Feature flags ----------------------------------------------------- */
  await prisma.featureFlag.createMany({
    data: [
      { key: "AI_RECOMMENDATIONS", enabled: true, description: "Personalised next-lesson suggestions" },
      { key: "AI_IMAGE_GENERATION", enabled: true, description: "Admin illustration generator" },
      { key: "VOICE_CONTROL", enabled: true, description: "Speech commands in lessons and games" },
      { key: "PWA", enabled: true, description: "Installable app and offline shell" },
      { key: "LEADERBOARD", enabled: true, description: "Public star ranking" },
      { key: "PUSH_NOTIFICATIONS", enabled: true, description: "Web push reminders" },
      { key: "CERTIFICATES", enabled: true, description: "Printable PDF certificates" },
      { key: "OFFLINE_LESSONS", enabled: true, description: "Cache lessons for offline play" },
    ],
  });

  /* --- Users ------------------------------------------------------------- */
  const admin = await prisma.user.create({
    data: {
      email: "admin@kidslearn.app",
      passwordHash,
      name: "Platform Admin",
      role: "ADMIN",
      locale: Locale.EN,
      avatarGlyph: "🛠️",
      avatarTone: "lagoon",
      lastSeenAt: new Date(),
    },
  });

  const parent = await prisma.user.create({
    data: {
      email: "parent@kidslearn.app",
      passwordHash,
      name: "Asadbek Azimov",
      role: "PARENT",
      locale: Locale.EN,
      phone: "+998 90 123 45 67",
      avatarGlyph: "🧔🏻",
      avatarTone: "brand",
      lastSeenAt: new Date(),
      parentProfile: { create: { timezone: "Asia/Tashkent" } },
    },
  });

  // Extra families so admin tables, search and the leaderboard have volume.
  const otherParents = await Promise.all(
    ["Madina Karimova", "Jasur Tursunov", "Nilufar Yusupova", "Bekzod Rahimov"].map((name, index) =>
      prisma.user.create({
        data: {
          email: `parent${index + 2}@kidslearn.app`,
          passwordHash,
          name,
          role: "PARENT",
          locale: index % 2 === 0 ? Locale.UZ : Locale.RU,
          phone: `+998 9${index} ${100 + index} ${20 + index} ${10 + index}`,
          avatarGlyph: pick(["👩🏻", "🧑🏽", "👩🏽", "🧔🏽"]),
          avatarTone: pick(["sky", "mint", "blossom", "sun"]),
          lastSeenAt: new Date(Date.now() - randomInt(1, 96) * 3_600_000),
          parentProfile: { create: { timezone: "Asia/Tashkent" } },
        },
      }),
    ),
  );

  /* --- Subjects ---------------------------------------------------------- */
  const subjectSeed = [
    { slug: "colors", glyph: "🎨", tone: "blossom", names: t("Ranglar", "Цвета", "Colors") },
    { slug: "animals", glyph: "🦁", tone: "sun", names: t("Hayvonlar", "Животные", "Animals") },
    { slug: "fruits", glyph: "🍎", tone: "coral", names: t("Mevalar", "Фрукты", "Fruits") },
    { slug: "letters", glyph: "🔤", tone: "grape", names: t("Harflar", "Буквы", "Letters") },
    { slug: "numbers", glyph: "🔢", tone: "sky", names: t("Raqamlar", "Числа", "Numbers") },
    { slug: "shapes", glyph: "🔷", tone: "lagoon", names: t("Shakllar", "Фигуры", "Shapes") },
    { slug: "english", glyph: "🇬🇧", tone: "brand", names: t("Ingliz tili", "Английский", "English") },
    { slug: "math", glyph: "➕", tone: "mint", names: t("Matematika", "Математика", "Math") },
    { slug: "logic", glyph: "🧩", tone: "tangerine", names: t("Mantiq", "Логика", "Logic") },
  ];

  const subjects = await Promise.all(
    subjectSeed.map((subject, order) =>
      prisma.subject.create({
        data: {
          slug: subject.slug,
          glyph: subject.glyph,
          tone: subject.tone,
          order,
          translations: {
            create: subject.names.map((n) => ({ locale: n.locale, name: n.value, description: "" })),
          },
        },
      }),
    ),
  );
  const subjectBySlug = new Map(subjects.map((s) => [s.slug, s]));
  const need = (slug: string) => {
    const subject = subjectBySlug.get(slug);
    if (!subject) throw new Error(`Missing subject ${slug}`);
    return subject;
  };

  /* --- Categories -------------------------------------------------------- */
  const categorySeed: Array<[string, string, string, string, string]> = [
    ["primary-colors", "colors", "Asosiy ranglar", "Основные цвета", "Primary colours"],
    ["mixing-colors", "colors", "Ranglarni aralashtirish", "Смешивание цветов", "Colour mixing"],
    ["farm-animals", "animals", "Uy hayvonlari", "Домашние животные", "Farm animals"],
    ["jungle-animals", "animals", "Jangal hayvonlari", "Животные джунглей", "Jungle animals"],
    ["counting-1-10", "numbers", "1 dan 10 gacha", "Счёт до 10", "Counting 1–10"],
    ["counting-11-20", "numbers", "11 dan 20 gacha", "Счёт до 20", "Counting 11–20"],
    ["uppercase", "letters", "Bosh harflar", "Заглавные буквы", "Uppercase letters"],
    ["flat-shapes", "shapes", "Yassi shakllar", "Плоские фигуры", "Flat shapes"],
  ];

  const categories = await Promise.all(
    categorySeed.map(([slug, subjectSlug, uz, ru, en]) =>
      prisma.category.create({
        data: {
          slug,
          subjectId: need(subjectSlug).id,
          status: "PUBLISHED",
          translations: { create: t(uz, ru, en).map((n) => ({ locale: n.locale, name: n.value })) },
        },
      }),
    ),
  );
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  /* --- Lessons ----------------------------------------------------------- */
  interface LessonSeed {
    slug: string;
    subject: string;
    category?: string;
    age: "AGE_1_2" | "AGE_3_4" | "AGE_5_7";
    difficulty: "EASY" | "MEDIUM" | "HARD";
    minutes: number;
    glyph: string;
    tone: string;
    status: "DRAFT" | "REVIEW" | "PUBLISHED";
    titles: ReturnType<typeof t>;
    blocks: Array<{
      type: "TEXT" | "QUESTION";
      glyph?: string;
      body?: ReturnType<typeof t>;
      sayIt?: ReturnType<typeof t>;
      prompt?: ReturnType<typeof t>;
      options?: Array<{ glyph: string; correct?: boolean; labels: ReturnType<typeof t> }>;
    }>;
  }

  const lessonSeed: LessonSeed[] = [
    {
      slug: "colors-around-us",
      subject: "colors",
      category: "primary-colors",
      age: "AGE_1_2",
      difficulty: "EASY",
      minutes: 7,
      glyph: "🌈",
      tone: "blossom",
      status: "PUBLISHED",
      titles: t("Atrofimizdagi ranglar", "Цвета вокруг нас", "Colors Around Us"),
      blocks: [
        { type: "TEXT", glyph: "🔴", body: t("Qizil olma.", "Красное яблоко.", "A red apple."), sayIt: t("Qizil", "Красный", "Red") },
        { type: "TEXT", glyph: "🔵", body: t("Ko'k osmon.", "Синее небо.", "The blue sky."), sayIt: t("Ko'k", "Синий", "Blue") },
        {
          type: "QUESTION",
          prompt: t("Qaysi biri qizil?", "Какой из них красный?", "Which one is red?"),
          options: [
            { glyph: "🔵", labels: t("Ko'k", "Синий", "Blue") },
            { glyph: "🔴", correct: true, labels: t("Qizil", "Красный", "Red") },
            { glyph: "🟢", labels: t("Yashil", "Зелёный", "Green") },
            { glyph: "🟡", labels: t("Sariq", "Жёлтый", "Yellow") },
          ],
        },
        { type: "TEXT", glyph: "🟢", body: t("Yashil o't.", "Зелёная трава.", "Green grass."), sayIt: t("Yashil", "Зелёный", "Green") },
        {
          type: "QUESTION",
          prompt: t("Qaysi biri yashil?", "Какой из них зелёный?", "Which one is green?"),
          options: [
            { glyph: "🟢", correct: true, labels: t("Yashil", "Зелёный", "Green") },
            { glyph: "🟡", labels: t("Sariq", "Жёлтый", "Yellow") },
            { glyph: "🔴", labels: t("Qizil", "Красный", "Red") },
          ],
        },
      ],
    },
    {
      slug: "learn-numbers",
      subject: "numbers",
      category: "counting-1-10",
      age: "AGE_3_4",
      difficulty: "EASY",
      minutes: 8,
      glyph: "🔢",
      tone: "sky",
      status: "PUBLISHED",
      titles: t("Raqamlarni o'rganamiz", "Учим числа", "Learn Numbers"),
      blocks: [
        { type: "TEXT", glyph: "🍎", body: t("Bitta olma.", "Одно яблоко.", "One apple."), sayIt: t("Bir", "Один", "One") },
        { type: "TEXT", glyph: "🍌", body: t("Ikkita banan.", "Два банана.", "Two bananas."), sayIt: t("Ikki", "Два", "Two") },
        {
          type: "QUESTION",
          prompt: t("Nechta yulduz bor? ⭐⭐", "Сколько звёзд? ⭐⭐", "How many stars? ⭐⭐"),
          options: [
            { glyph: "1️⃣", labels: t("Bir", "Один", "One") },
            { glyph: "2️⃣", correct: true, labels: t("Ikki", "Два", "Two") },
            { glyph: "3️⃣", labels: t("Uch", "Три", "Three") },
            { glyph: "4️⃣", labels: t("To'rt", "Четыре", "Four") },
          ],
        },
        { type: "TEXT", glyph: "🥕", body: t("Uchta sabzi.", "Три моркови.", "Three carrots."), sayIt: t("Uch", "Три", "Three") },
      ],
    },
    {
      slug: "animals-world",
      subject: "animals",
      category: "farm-animals",
      age: "AGE_1_2",
      difficulty: "EASY",
      minutes: 10,
      glyph: "🐘",
      tone: "mint",
      status: "PUBLISHED",
      titles: t("Hayvonlar olami", "Мир животных", "Animals World"),
      blocks: [
        { type: "TEXT", glyph: "🐘", body: t("Fil katta.", "Слон большой.", "The elephant is big."), sayIt: t("Fil", "Слон", "Elephant") },
        { type: "TEXT", glyph: "🦁", body: t("Sher baqiradi.", "Лев рычит.", "The lion roars."), sayIt: t("Sher", "Лев", "Lion") },
        {
          type: "QUESTION",
          prompt: t("Kim baqiradi?", "Кто рычит?", "Which animal roars?"),
          options: [
            { glyph: "🐘", labels: t("Fil", "Слон", "Elephant") },
            { glyph: "🦁", correct: true, labels: t("Sher", "Лев", "Lion") },
            { glyph: "🐵", labels: t("Maymun", "Обезьяна", "Monkey") },
          ],
        },
      ],
    },
    {
      slug: "alphabet",
      subject: "letters",
      category: "uppercase",
      age: "AGE_5_7",
      difficulty: "MEDIUM",
      minutes: 12,
      glyph: "🔤",
      tone: "grape",
      status: "PUBLISHED",
      titles: t("Alifbo", "Алфавит", "Alphabet"),
      blocks: [
        { type: "TEXT", glyph: "🅰️", body: t("A — Olma.", "A — Apple.", "A is for Apple."), sayIt: t("A", "А", "A") },
        { type: "TEXT", glyph: "🅱️", body: t("B — Ball.", "B — Мяч.", "B is for Ball."), sayIt: t("B", "Б", "B") },
        {
          type: "QUESTION",
          prompt: t("Qaysi biri A harfi?", "Какая буква A?", "Which one is the letter A?"),
          options: [
            { glyph: "🅱️", labels: t("B", "B", "B") },
            { glyph: "🅰️", correct: true, labels: t("A", "A", "A") },
            { glyph: "🇨", labels: t("C", "C", "C") },
          ],
        },
      ],
    },
    {
      slug: "shapes-and-patterns",
      subject: "shapes",
      category: "flat-shapes",
      age: "AGE_3_4",
      difficulty: "MEDIUM",
      minutes: 9,
      glyph: "🔷",
      tone: "lagoon",
      status: "PUBLISHED",
      titles: t("Shakllar va naqshlar", "Фигуры и узоры", "Shapes & Patterns"),
      blocks: [
        { type: "TEXT", glyph: "⭕", body: t("Doira dumaloq.", "Круг круглый.", "A circle is round."), sayIt: t("Doira", "Круг", "Circle") },
        { type: "TEXT", glyph: "🟦", body: t("Kvadratda to'rt tomon.", "У квадрата четыре стороны.", "A square has four sides."), sayIt: t("Kvadrat", "Квадрат", "Square") },
        {
          type: "QUESTION",
          prompt: t("Qaysi shakl dumaloq?", "Какая фигура круглая?", "Which shape is round?"),
          options: [
            { glyph: "🟦", labels: t("Kvadrat", "Квадрат", "Square") },
            { glyph: "🔺", labels: t("Uchburchak", "Треугольник", "Triangle") },
            { glyph: "⭕", correct: true, labels: t("Doira", "Круг", "Circle") },
          ],
        },
      ],
    },
    {
      slug: "counting-to-ten",
      subject: "numbers",
      category: "counting-11-20",
      age: "AGE_5_7",
      difficulty: "MEDIUM",
      minutes: 10,
      glyph: "🔟",
      tone: "sky",
      status: "PUBLISHED",
      titles: t("O'ngacha sanash", "Считаем до десяти", "Counting to Ten"),
      blocks: [
        { type: "TEXT", glyph: "🦆", body: t("Oltita o'rdak.", "Шесть уток.", "Six ducks."), sayIt: t("Olti", "Шесть", "Six") },
        {
          type: "QUESTION",
          prompt: t("7 dan keyin nima keladi?", "Что идёт после 7?", "What comes after 7?"),
          options: [
            { glyph: "6️⃣", labels: t("Olti", "Шесть", "Six") },
            { glyph: "8️⃣", correct: true, labels: t("Sakkiz", "Восемь", "Eight") },
            { glyph: "🔟", labels: t("O'n", "Десять", "Ten") },
          ],
        },
      ],
    },
    {
      slug: "mixing-colors",
      subject: "colors",
      category: "mixing-colors",
      age: "AGE_5_7",
      difficulty: "HARD",
      minutes: 12,
      glyph: "🖌️",
      tone: "blossom",
      status: "PUBLISHED",
      titles: t("Ranglarni aralashtirish", "Смешиваем цвета", "Mixing Colors"),
      blocks: [
        { type: "TEXT", glyph: "🟠", body: t("Qizil va sariq — to'q sariq!", "Красный и жёлтый — оранжевый!", "Red and yellow make orange!"), sayIt: t("To'q sariq", "Оранжевый", "Orange") },
        {
          type: "QUESTION",
          prompt: t("Ko'k va sariq qanday rang beradi?", "Какой цвет дают синий и жёлтый?", "What do blue and yellow make?"),
          options: [
            { glyph: "🟣", labels: t("Siyoh", "Фиолетовый", "Purple") },
            { glyph: "🟢", correct: true, labels: t("Yashil", "Зелёный", "Green") },
            { glyph: "🟠", labels: t("To'q sariq", "Оранжевый", "Orange") },
          ],
        },
      ],
    },
    {
      slug: "my-five-senses",
      subject: "logic",
      age: "AGE_5_7",
      difficulty: "MEDIUM",
      minutes: 11,
      glyph: "👀",
      tone: "coral",
      status: "REVIEW",
      titles: t("Beshta sezgim", "Пять моих чувств", "My Five Senses"),
      blocks: [{ type: "TEXT", glyph: "👀", body: t("Biz ko'z bilan ko'ramiz.", "Мы видим глазами.", "We see with our eyes."), sayIt: t("Ko'rish", "Видеть", "See") }],
    },
    {
      slug: "fruit-basket",
      subject: "fruits",
      age: "AGE_1_2",
      difficulty: "EASY",
      minutes: 6,
      glyph: "🍇",
      tone: "grape",
      status: "DRAFT",
      titles: t("Meva savati", "Корзина фруктов", "Fruit Basket"),
      blocks: [{ type: "TEXT", glyph: "🍇", body: t("Uzum shirin.", "Виноград сладкий.", "Grapes are sweet."), sayIt: t("Uzum", "Виноград", "Grapes") }],
    },
  ];

  const lessons = [];
  for (const seed of lessonSeed) {
    const lesson = await prisma.lesson.create({
      data: {
        slug: seed.slug,
        subjectId: need(seed.subject).id,
        categoryId: seed.category ? (categoryBySlug.get(seed.category)?.id ?? null) : null,
        ageCategory: seed.age,
        difficulty: seed.difficulty,
        status: seed.status,
        durationMinutes: seed.minutes,
        xpReward: seed.difficulty === "HARD" ? 35 : seed.difficulty === "MEDIUM" ? 25 : 20,
        starReward: seed.difficulty === "HARD" ? 7 : 5,
        glyph: seed.glyph,
        tone: seed.tone,
        publishedAt: seed.status === "PUBLISHED" ? new Date(Date.now() - randomInt(5, 180) * 86_400_000) : null,
        completions: seed.status === "PUBLISHED" ? randomInt(400, 9000) : 0,
        translations: {
          create: seed.titles.map((n) => ({ locale: n.locale, title: n.value, description: "" })),
        },
      },
    });

    for (const [index, block] of seed.blocks.entries()) {
      const created = await prisma.lessonBlock.create({
        data: {
          lessonId: lesson.id,
          order: index,
          type: block.type,
          glyph: block.glyph ?? null,
          translations: {
            create: (block.body ?? block.prompt ?? []).map((n) => ({
              locale: n.locale,
              title: null,
              body: block.type === "TEXT" ? n.value : null,
              sayIt: block.sayIt?.find((word) => word.locale === n.locale)?.value ?? null,
            })),
          },
        },
      });

      if (block.type === "QUESTION" && block.prompt && block.options) {
        const question = await prisma.lessonQuestion.create({
          data: {
            blockId: created.id,
            translations: { create: block.prompt.map((n) => ({ locale: n.locale, prompt: n.value })) },
          },
        });
        for (const [optionIndex, option] of block.options.entries()) {
          await prisma.lessonQuestionOption.create({
            data: {
              questionId: question.id,
              glyph: option.glyph,
              order: optionIndex,
              isCorrect: option.correct ?? false,
              translations: { create: option.labels.map((n) => ({ locale: n.locale, label: n.value })) },
            },
          });
        }
      }
    }

    lessons.push(lesson);
  }

  /* --- Games ------------------------------------------------------------- */
  const COLORS = [
    { key: "red", glyph: "🔴", tone: "coral", labels: t("Qizil", "Красный", "Red") },
    { key: "green", glyph: "🟢", tone: "mint", labels: t("Yashil", "Зелёный", "Green") },
    { key: "blue", glyph: "🔵", tone: "sky", labels: t("Ko'k", "Синий", "Blue") },
    { key: "yellow", glyph: "🟡", tone: "sun", labels: t("Sariq", "Жёлтый", "Yellow") },
    { key: "purple", glyph: "🟣", tone: "grape", labels: t("Siyoh", "Фиолетовый", "Purple") },
    { key: "orange", glyph: "🟠", tone: "tangerine", labels: t("To'q sariq", "Оранжевый", "Orange") },
  ];
  const ANIMALS = [
    { key: "cow", glyph: "🐄", sound: t("Mo'-o'!", "Му-у!", "Moo!"), labels: t("Sigir", "Корова", "Cow") },
    { key: "dog", glyph: "🐶", sound: t("Vov-vov!", "Гав-гав!", "Woof woof!"), labels: t("It", "Собака", "Dog") },
    { key: "cat", glyph: "🐱", sound: t("Miyov!", "Мяу!", "Meow!"), labels: t("Mushuk", "Кошка", "Cat") },
    { key: "duck", glyph: "🦆", sound: t("G'aq-g'aq!", "Кря-кря!", "Quack!"), labels: t("O'rdak", "Утка", "Duck") },
    { key: "lion", glyph: "🦁", sound: t("Arr-r!", "Р-р-р!", "Roar!"), labels: t("Sher", "Лев", "Lion") },
    { key: "sheep", glyph: "🐑", sound: t("Ba-a!", "Бе-е!", "Baa!"), labels: t("Qo'y", "Овца", "Sheep") },
    { key: "frog", glyph: "🐸", sound: t("Qur-qur!", "Ква-ква!", "Ribbit!"), labels: t("Qurbaqa", "Лягушка", "Frog") },
    { key: "bee", glyph: "🐝", sound: t("G'uv-g'uv!", "Ж-ж-ж!", "Bzzzz!"), labels: t("Asalari", "Пчела", "Bee") },
  ];
  const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "K", "M", "O", "S"];
  const COUNTABLES = ["🍎", "⭐", "🎈", "🐟", "🌸", "🍪"];

  async function createGame(
    slug: string,
    type: "COLOR_MATCH" | "ANIMAL_SOUNDS" | "LETTER_MATCH" | "NUMBER_GAME" | "PUZZLE" | "MEMORY",
    subjectSlug: string,
    age: "AGE_1_2" | "AGE_3_4" | "AGE_5_7",
    difficulty: "EASY" | "MEDIUM" | "HARD",
    glyph: string,
    tone: string,
    titles: ReturnType<typeof t>,
    descriptions: ReturnType<typeof t>,
    boardConfig?: Prisma.InputJsonValue,
  ) {
    const plays = randomInt(3000, 32000);
    return prisma.game.create({
      data: {
        slug,
        type,
        subjectId: need(subjectSlug).id,
        ageCategory: age,
        difficulty,
        status: "PUBLISHED",
        glyph,
        tone,
        roundsPerSession: 6,
        boardConfig,
        plays,
        completedPlays: Math.round(plays * (0.7 + random() * 0.25)),
        scoreSum: Math.round(plays * (4 + random() * 1.5)),
        translations: {
          create: titles.map((n, i) => ({
            locale: n.locale,
            title: n.value,
            description: descriptions[i]?.value ?? "",
          })),
        },
      },
    });
  }

  const colorGame = await createGame(
    "color-match", "COLOR_MATCH", "colors", "AGE_1_2", "EASY", "🎨", "blossom",
    t("Rang topish", "Найди цвет", "Color Match"),
    t("So'ralgan rangni toping.", "Найдите нужный цвет.", "Tap the colour we ask for."),
  );
  for (const [index, colour] of COLORS.entries()) {
    const question = await prisma.gameQuestion.create({
      data: {
        gameId: colorGame.id,
        key: colour.key,
        promptGlyph: "🎨",
        promptTone: colour.tone,
        order: index,
        translations: {
          create: colour.labels.map((n) => ({
            locale: n.locale,
            prompt: n.locale === Locale.UZ ? `${n.value} rangni toping` : n.locale === Locale.RU ? `Найди ${n.value.toLowerCase()} цвет` : `Find the ${n.value.toLowerCase()} colour`,
          })),
        },
      },
    });
    for (const [optionIndex, option] of COLORS.entries()) {
      await prisma.gameQuestionOption.create({
        data: {
          questionId: question.id,
          key: option.key,
          glyph: option.glyph,
          tone: option.tone,
          order: optionIndex,
          isCorrect: option.key === colour.key,
          translations: { create: option.labels.map((n) => ({ locale: n.locale, label: n.value })) },
        },
      });
    }
  }

  const animalGame = await createGame(
    "animal-sounds", "ANIMAL_SOUNDS", "animals", "AGE_1_2", "EASY", "🐶", "tangerine",
    t("Hayvon tovushlari", "Звуки животных", "Animal Sounds"),
    t("Tovushni tinglang va hayvonni tanlang.", "Послушайте звук и выберите животное.", "Listen, then pick the animal."),
  );
  for (const [index, animal] of ANIMALS.entries()) {
    const question = await prisma.gameQuestion.create({
      data: {
        gameId: animalGame.id,
        key: animal.key,
        promptGlyph: "🔊",
        promptTone: "tangerine",
        order: index,
        translations: {
          create: animal.sound.map((n) => ({ locale: n.locale, prompt: n.value })),
        },
      },
    });
    for (const [optionIndex, option] of ANIMALS.entries()) {
      await prisma.gameQuestionOption.create({
        data: {
          questionId: question.id,
          key: option.key,
          glyph: option.glyph,
          order: optionIndex,
          isCorrect: option.key === animal.key,
          translations: { create: option.labels.map((n) => ({ locale: n.locale, label: n.value })) },
        },
      });
    }
  }

  const letterGame = await createGame(
    "letter-match", "LETTER_MATCH", "letters", "AGE_5_7", "MEDIUM", "🅰️", "coral",
    t("Harf topish", "Найди букву", "Letter Match"),
    t("Ko'rsatilgan harfni toping.", "Найдите показанную букву.", "Find the letter we show."),
  );
  for (const [index, letter] of LETTERS.entries()) {
    const question = await prisma.gameQuestion.create({
      data: {
        gameId: letterGame.id,
        key: letter,
        promptGlyph: letter,
        promptTone: "coral",
        order: index,
        translations: {
          create: [
            { locale: Locale.UZ, prompt: `${letter} harfini toping` },
            { locale: Locale.RU, prompt: `Найди букву ${letter}` },
            { locale: Locale.EN, prompt: `Find the letter ${letter}` },
          ],
        },
      },
    });
    for (const [optionIndex, option] of LETTERS.entries()) {
      await prisma.gameQuestionOption.create({
        data: {
          questionId: question.id,
          key: option,
          glyph: option,
          order: optionIndex,
          isCorrect: option === letter,
          translations: {
            create: [Locale.UZ, Locale.RU, Locale.EN].map((locale) => ({ locale, label: option })),
          },
        },
      });
    }
  }

  const numberGame = await createGame(
    "number-game", "NUMBER_GAME", "numbers", "AGE_3_4", "MEDIUM", "🔢", "sky",
    t("Raqamlar o'yini", "Игра с числами", "Number Game"),
    t("Buyumlarni sanang va raqamni tanlang.", "Сосчитайте предметы и выберите число.", "Count the objects and choose the number."),
  );
  for (let value = 1; value <= 9; value += 1) {
    const icon = COUNTABLES[(value - 1) % COUNTABLES.length];
    const question = await prisma.gameQuestion.create({
      data: {
        gameId: numberGame.id,
        key: String(value),
        promptGlyph: icon.repeat(value),
        promptTone: "sky",
        order: value,
        translations: {
          create: [
            { locale: Locale.UZ, prompt: "Nechta ko'ryapsiz?" },
            { locale: Locale.RU, prompt: "Сколько ты видишь?" },
            { locale: Locale.EN, prompt: "How many do you see?" },
          ],
        },
      },
    });
    for (let option = 1; option <= 9; option += 1) {
      await prisma.gameQuestionOption.create({
        data: {
          questionId: question.id,
          key: String(option),
          glyph: String(option),
          order: option,
          isCorrect: option === value,
          translations: {
            create: [Locale.UZ, Locale.RU, Locale.EN].map((locale) => ({ locale, label: String(option) })),
          },
        },
      });
    }
  }

  await createGame(
    "puzzle", "PUZZLE", "shapes", "AGE_5_7", "HARD", "🧩", "sun",
    t("Pazl", "Пазл", "Puzzle"),
    t("Har bir bo'lakni joyiga qo'ying.", "Поставьте каждую деталь на место.", "Drag every piece back into place."),
    {
      scenes: [
        { id: "rocket", title: "Rocket", tone: "grape", tiles: ["🌌", "⭐", "🌌", "☁️", "🚀", "☁️", "🌍", "🔥", "🌍"] },
        { id: "garden", title: "Garden", tone: "mint", tiles: ["☀️", "☁️", "🦋", "🌳", "🌷", "🌳", "🌱", "🐞", "🌱"] },
        { id: "ocean", title: "Ocean", tone: "sky", tiles: ["🌊", "⛵", "🌊", "🐠", "🐙", "🐠", "🪸", "🦀", "🪸"] },
      ],
    },
  );

  await createGame(
    "memory-game", "MEMORY", "logic", "AGE_3_4", "MEDIUM", "🃏", "grape",
    t("Xotira o'yini", "Игра на память", "Memory Game"),
    t("Kartalarni aylantiring va juftlarni toping.", "Переворачивайте карты и находите пары.", "Flip the cards and find the pairs."),
    { faces: ["🐻", "🦊", "🐼", "🐸", "🐧", "🦄", "🐯", "🐨", "🐷", "🐵"], pairs: 6 },
  );

  /* --- Achievements ------------------------------------------------------ */
  const achievementSeed = [
    { code: "FIRST_LESSON", tier: "BRONZE", glyph: "👣", tone: "mint", xp: 10, category: "learning", condition: { metric: "lessonsCompleted", gte: 1 }, titles: t("Birinchi qadam", "Первый шаг", "First Steps"), descriptions: t("Birinchi darsni tugating", "Пройдите первый урок", "Complete your very first lesson") },
    { code: "FIRST_GAME", tier: "BRONZE", glyph: "🎮", tone: "sky", xp: 10, category: "games", condition: { metric: "gamesPlayed", gte: 1 }, titles: t("Birinchi o'yin", "Первая игра", "First Game"), descriptions: t("Birinchi o'yinni o'ynang", "Сыграйте в первую игру", "Play your first game") },
    { code: "TEN_LESSONS", tier: "SILVER", glyph: "📚", tone: "grape", xp: 50, category: "learning", condition: { metric: "lessonsCompleted", gte: 10 }, titles: t("O'nta dars", "Десять уроков", "Ten Lessons"), descriptions: t("10 ta darsni tugating", "Пройдите 10 уроков", "Complete 10 lessons") },
    { code: "MATH_MASTER", tier: "GOLD", glyph: "🎖️", tone: "coral", xp: 80, category: "mastery", condition: { metric: "correctAnswers", gte: 25, subjectSlug: "numbers" }, titles: t("Matematika ustasi", "Мастер математики", "Math Master"), descriptions: t("25 ta raqam savoliga to'g'ri javob bering", "Ответьте правильно на 25 вопросов о числах", "Answer 25 number questions correctly") },
    { code: "WEEK_STREAK", tier: "SILVER", glyph: "🔥", tone: "tangerine", xp: 50, category: "streak", condition: { metric: "currentStreak", gte: 7 }, titles: t("Haftalik seriya", "Недельная серия", "Week Streak"), descriptions: t("7 kun ketma-ket o'rganing", "Учитесь 7 дней подряд", "Learn 7 days in a row") },
    { code: "GOLD_MEDAL", tier: "GOLD", glyph: "🏆", tone: "sun", xp: 100, category: "mastery", condition: { metric: "stars", gte: 100 }, titles: t("Oltin medal", "Золотая медаль", "Gold Medal"), descriptions: t("100 ta yulduz to'plang", "Соберите 100 звёзд", "Earn 100 stars") },
    { code: "SPEED_LEARNER", tier: "SILVER", glyph: "⚡", tone: "sun", xp: 60, category: "learning", condition: { metric: "lessonsCompleted", gte: 25 }, titles: t("Tez o'rganuvchi", "Быстрый ученик", "Speed Learner"), descriptions: t("25 ta darsni tugating", "Пройдите 25 уроков", "Complete 25 lessons") },
    { code: "EXPLORER", tier: "BRONZE", glyph: "🧭", tone: "sky", xp: 45, category: "learning", condition: { metric: "subjectsTouched", gte: 5 }, titles: t("Kashfiyotchi", "Исследователь", "Explorer"), descriptions: t("5 ta fanni sinab ko'ring", "Попробуйте 5 предметов", "Try five different subjects") },
    { code: "DIAMOND_LEARNER", tier: "DIAMOND", glyph: "💎", tone: "lagoon", xp: 250, category: "mastery", condition: { metric: "xp", gte: 5000 }, titles: t("Olmos o'quvchi", "Алмазный ученик", "Diamond Learner"), descriptions: t("5000 XP to'plang", "Наберите 5000 XP", "Reach 5000 XP") },
    { code: "UNSTOPPABLE", tier: "DIAMOND", glyph: "🚀", tone: "brand", xp: 200, category: "streak", condition: { metric: "longestStreak", gte: 30 }, titles: t("To'xtatib bo'lmas", "Неудержимый", "Unstoppable"), descriptions: t("30 kun ketma-ket o'rganing", "Учитесь 30 дней подряд", "Learn 30 days in a row") },
  ] as const;

  for (const [order, achievement] of achievementSeed.entries()) {
    await prisma.achievement.create({
      data: {
        code: achievement.code,
        tier: achievement.tier,
        category: achievement.category,
        glyph: achievement.glyph,
        tone: achievement.tone,
        xpReward: achievement.xp,
        condition: achievement.condition as Prisma.InputJsonValue,
        order,
        translations: {
          create: achievement.titles.map((n, i) => ({
            locale: n.locale,
            title: n.value,
            description: achievement.descriptions[i]?.value ?? "",
          })),
        },
      },
    });
  }

  /* --- Rewards ----------------------------------------------------------- */
  const rewardSeed = [
    { code: "RAINBOW_THEME", glyph: "🌈", tone: "blossom", cost: 50, titles: t("Kamalak mavzusi", "Радужная тема", "Rainbow theme"), descriptions: t("Rangli bosh sahifa", "Цветная главная", "A colourful home screen") },
    { code: "STICKER_PACK", glyph: "✨", tone: "lagoon", cost: 90, titles: t("Stiker to'plami", "Набор наклеек", "Sticker pack"), descriptions: t("12 ta yangi stiker", "12 новых наклеек", "Twelve new stickers") },
    { code: "SPACE_MASCOT", glyph: "🧑‍🚀", tone: "grape", cost: 120, titles: t("Kosmik maskot", "Космический маскот", "Space mascot"), descriptions: t("Astronavt Leo qo'shiladi", "Астронавт Лео присоединяется", "Astronaut Leo joins you") },
    { code: "DINO_AVATAR", glyph: "🦖", tone: "mint", cost: 150, titles: t("Dino avatar", "Дино-аватар", "Dino avatar"), descriptions: t("Profilingizga dinozavr", "Динозавр в профиль", "Roar into your profile") },
    { code: "NIGHT_OWL", glyph: "🦉", tone: "sky", cost: 175, titles: t("Tungi boyqush", "Ночная сова", "Night mode owl"), descriptions: t("Kechqurun darslar uchun", "Для вечерних уроков", "For evening lessons") },
    { code: "GOLDEN_FRAME", glyph: "🖼️", tone: "sun", cost: 200, titles: t("Oltin ramka", "Золотая рамка", "Golden frame"), descriptions: t("Avatar uchun ramka", "Рамка для аватара", "A shiny avatar border") },
  ];
  for (const [order, reward] of rewardSeed.entries()) {
    await prisma.reward.create({
      data: {
        code: reward.code,
        glyph: reward.glyph,
        tone: reward.tone,
        costStars: reward.cost,
        order,
        translations: {
          create: reward.titles.map((n, i) => ({
            locale: n.locale,
            title: n.value,
            description: reward.descriptions[i]?.value ?? "",
          })),
        },
      },
    });
  }

  /* --- Children + history ------------------------------------------------ */
  const childSeed = [
    { parentId: parent.id, name: "Ali", dob: "2021-03-14", glyph: "👦🏻", tone: "sky", days: 90, intensity: 0.85, favourite: "colors" },
    { parentId: parent.id, name: "Zarina", dob: "2023-06-02", glyph: "👧🏻", tone: "blossom", days: 60, intensity: 0.55, favourite: "animals" },
    { parentId: parent.id, name: "Omar", dob: "2019-01-22", glyph: "🧒🏽", tone: "mint", days: 90, intensity: 0.95, favourite: "numbers" },
    ...otherParents.flatMap((other, index) => [
      { parentId: other.id, name: pick(["Kamola", "Bobur", "Nilufar", "Timur", "Sevara", "Doston"]), dob: `202${index % 3}-0${(index % 9) + 1}-1${index % 9}`, glyph: pick(["👦🏻", "👧🏽", "🧒🏻"]), tone: pick(["sun", "coral", "grape", "lagoon"]), days: 45, intensity: 0.4 + random() * 0.4, favourite: pick(["colors", "animals", "letters", "shapes"]) },
    ]),
  ];

  const publishedLessons = lessons.filter((l) => l.status === "PUBLISHED");
  const allGames = await prisma.game.findMany({ include: { questions: { include: { options: true } } } });

  for (const seed of childSeed) {
    const child = await prisma.child.create({
      data: {
        parentId: seed.parentId,
        name: seed.name,
        dateOfBirth: new Date(seed.dob),
        avatarGlyph: seed.glyph,
        avatarTone: seed.tone,
        locale: Locale.EN,
        dailyGoalLessons: randomInt(4, 8),
        favouriteSubjectId: need(seed.favourite).id,
        progress: { create: {} },
      },
    });

    let xp = 0;
    let stars = 0;
    let lessonsCompleted = 0;
    let gamesPlayed = 0;
    let questionsAnswered = 0;
    let correctAnswers = 0;
    let learningSeconds = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let lastActiveDayKey: string | null = null;
    const subjectTally = new Map<string, { total: number; correct: number }>();

    for (let dayOffset = seed.days; dayOffset >= 0; dayOffset -= 1) {
      const active = random() < seed.intensity;
      const date = new Date(Date.now() - dayOffset * 86_400_000);
      const dayKey = date.toISOString().slice(0, 10);

      if (!active) {
        currentStreak = 0;
        continue;
      }

      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
      lastActiveDayKey = dayKey;

      const dayLessons = randomInt(0, 3);
      const dayGames = randomInt(1, 3);
      const dayQuestions = dayLessons * 2 + dayGames * 6;
      const accuracy = 0.6 + random() * 0.38;
      const dayCorrect = Math.round(dayQuestions * accuracy);
      const daySeconds = dayLessons * randomInt(300, 700) + dayGames * randomInt(90, 240);
      const dayXp = dayLessons * 22 + dayCorrect * 5;
      const dayStars = dayLessons * 5 + dayGames * randomInt(2, 5);

      xp += dayXp;
      stars += dayStars;
      lessonsCompleted += dayLessons;
      gamesPlayed += dayGames;
      questionsAnswered += dayQuestions;
      correctAnswers += dayCorrect;
      learningSeconds += daySeconds;

      const subject = need(pick(["colors", "animals", "numbers", "letters", "shapes"]));
      const tally = subjectTally.get(subject.id) ?? { total: 0, correct: 0 };
      subjectTally.set(subject.id, { total: tally.total + dayQuestions, correct: tally.correct + dayCorrect });

      await prisma.dailyStat.create({
        data: {
          childId: child.id,
          dayKey,
          date: new Date(`${dayKey}T00:00:00.000Z`),
          learningSeconds: daySeconds,
          lessonsCompleted: dayLessons,
          gamesPlayed: dayGames,
          questionsAnswered: dayQuestions,
          correctAnswers: dayCorrect,
          xpEarned: dayXp,
          starsEarned: dayStars,
        },
      });

      // A handful of recent days also get real activity rows and attempts, so
      // the feed and the attempt tables are not empty.
      if (dayOffset <= 7) {
        const lesson = pick(publishedLessons);
        await prisma.activity.create({
          data: {
            childId: child.id,
            type: "LESSON_COMPLETED",
            title: `Completed a lesson`,
            detail: `Scored ${Math.round(accuracy * 100)}%`,
            glyph: lesson.glyph,
            tone: lesson.tone,
            xp: 22,
            stars: 5,
            refId: lesson.id,
            createdAt: date,
          },
        });

        const game = pick(allGames);
        const total = 6;
        const gotRight = Math.round(total * accuracy);
        await prisma.gameAttempt.create({
          data: {
            childId: child.id,
            gameId: game.id,
            clientAttemptId: `seed-${child.id}-${dayOffset}-${game.id}`,
            score: gotRight,
            totalQuestions: total,
            correctAnswers: gotRight,
            wrongAnswers: total - gotRight,
            accuracy: Math.round((gotRight / total) * 100),
            durationSeconds: randomInt(60, 200),
            starsAwarded: gotRight >= 5 ? 5 : 3,
            xpAwarded: gotRight * 5,
            completedAt: date,
            createdAt: date,
          },
        });
      }
    }

    for (const lesson of publishedLessons.slice(0, randomInt(3, publishedLessons.length))) {
      const complete = random() < 0.6;
      await prisma.lessonProgress.create({
        data: {
          childId: child.id,
          lessonId: lesson.id,
          percent: complete ? 100 : randomInt(20, 90),
          starsEarned: complete ? lesson.starReward : randomInt(1, 3),
          completedAt: complete ? new Date(Date.now() - randomInt(1, 40) * 86_400_000) : null,
        },
      });
    }

    const progress = await prisma.progress.update({
      where: { childId: child.id },
      data: {
        xp,
        stars,
        points: xp + stars * 2,
        lessonsCompleted,
        gamesPlayed,
        questionsAnswered,
        correctAnswers,
        wrongAnswers: questionsAnswered - correctAnswers,
        learningSeconds,
        currentStreak,
        longestStreak,
        lastActiveDayKey,
        lastActivityAt: new Date(),
      },
    });

    for (const [subjectId, tally] of subjectTally) {
      const score = Math.round((tally.correct / Math.max(1, tally.total)) * 100);
      await prisma.subjectStat.create({
        data: {
          progressId: progress.id,
          subjectId,
          totalAnswers: tally.total,
          correctAnswers: tally.correct,
          score,
          previousScore: Math.max(0, score - randomInt(-4, 9)),
        },
      });
    }
  }

  /* --- Notifications ----------------------------------------------------- */
  const firstChild = await prisma.child.findFirstOrThrow({ where: { parentId: parent.id } });
  // Sample notifications carry message keys so they render in the parent's
  // locale from the very first sign-in, exactly like live system events.
  await prisma.notification.createMany({
    data: [
      {
        userId: parent.id, type: "ACHIEVEMENT_EARNED",
        title: `${firstChild.name} earned Gold Medal`, body: "100 stars collected — a big milestone.",
        glyph: "🏆", tone: "sun", href: "/achievements", childId: firstChild.id,
        messageKey: "achievement.earned",
        params: {
          child: firstChild.name,
          achievement: { en: "Gold Medal", uz: "Oltin medal", ru: "Золотая медаль" },
          description: {
            en: "100 stars collected — a big milestone.",
            uz: "100 ta yulduz to'plandi — katta yutuq.",
            ru: "Собрано 100 звёзд — большая веха.",
          },
        },
      },
      {
        userId: parent.id, type: "NEW_LESSON",
        title: "New lesson added", body: '"Mixing Colors" is now available.',
        glyph: "📚", tone: "mint", href: "/lessons",
        messageKey: "lesson.new",
        params: {
          lessonTitle: {
            en: "Mixing Colors",
            uz: "Ranglarni aralashtirish",
            ru: "Смешиваем цвета",
          },
        },
      },
      {
        userId: parent.id, type: "STREAK",
        title: `${firstChild.name} kept a streak going`, body: "Another day of learning in a row.",
        glyph: "🔥", tone: "tangerine", href: "/progress", childId: firstChild.id,
        messageKey: "streak.kept", params: { child: firstChild.name },
      },
      {
        userId: parent.id, type: "LESSON_REMINDER",
        title: "Today's learning isn't finished", body: `${firstChild.name}: today's goal is still open.`,
        glyph: "💡", tone: "sky", href: "/children", readAt: new Date(),
        messageKey: "lesson.reminder", params: { names: firstChild.name },
      },
      {
        userId: parent.id, type: "SYSTEM",
        title: "Weekly report is ready", body: "This week: 132 min, 9 lessons, 41 stars.",
        glyph: "📊", tone: "brand", href: "/statistics", readAt: new Date(),
        messageKey: "report.weekly", params: { minutes: 132, lessons: 9, stars: 41 },
      },
    ],
  });

  /* --- Audit log --------------------------------------------------------- */
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: "lesson.status_changed", resource: "lesson", resourceId: lessons[0].id, metadata: { status: "PUBLISHED" } },
      { userId: admin.id, action: "feature_flag.changed", resource: "feature_flag", resourceId: "LEADERBOARD", metadata: { enabled: true } },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    children: await prisma.child.count(),
    subjects: await prisma.subject.count(),
    lessons: await prisma.lesson.count(),
    games: await prisma.game.count(),
    gameQuestions: await prisma.gameQuestion.count(),
    achievements: await prisma.achievement.count(),
    dailyStats: await prisma.dailyStat.count(),
  };

  console.log("Seed complete:", counts);
  console.log("");
  console.log("  LOCAL DEVELOPMENT ONLY credentials");
  console.log(`  admin  : admin@kidslearn.app  / ${DEV_PASSWORD}`);
  console.log(`  parent : parent@kidslearn.app / ${DEV_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
