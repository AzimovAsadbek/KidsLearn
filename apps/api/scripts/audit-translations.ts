import "../src/env";
import { PrismaClient } from "@kidslearn/database";

/**
 * Reports every translatable content row that is missing a uz or ru
 * translation. Educational content must never fall back to English for a
 * child using another language, so the expected output is zero gaps.
 */
const prisma = new PrismaClient();

type Gap = { entity: string; id: string; label: string; missing: string[] };

function gapsOf(
  entity: string,
  rows: Array<{ id: string; label: string; locales: string[] }>,
): Gap[] {
  return rows
    .map((row) => {
      const have = row.locales.map((locale) => locale.toLowerCase());
      return {
        entity,
        id: row.id,
        label: row.label,
        missing: ["uz", "ru", "en"].filter((locale) => !have.includes(locale)),
      };
    })
    .filter((gap) => gap.missing.length > 0);
}

async function main() {
  const gaps: Gap[] = [];

  const subjects = await prisma.subject.findMany({ include: { translations: true } });
  gaps.push(...gapsOf("subject", subjects.map((s) => ({
    id: s.id, label: s.slug, locales: s.translations.map((t) => t.locale),
  }))));

  const categories = await prisma.category.findMany({ include: { translations: true } });
  gaps.push(...gapsOf("category", categories.map((c) => ({
    id: c.id, label: c.slug, locales: c.translations.map((t) => t.locale),
  }))));

  const lessons = await prisma.lesson.findMany({ include: { translations: true } });
  gaps.push(...gapsOf("lesson", lessons.map((l) => ({
    id: l.id, label: l.slug, locales: l.translations.map((t) => t.locale),
  }))));

  const blocks = await prisma.lessonBlock.findMany({
    include: { translations: true, lesson: true },
  });
  gaps.push(...gapsOf("lessonBlock", blocks.map((b) => ({
    id: b.id, label: `${b.lesson.slug}#${b.order}`, locales: b.translations.map((t) => t.locale),
  }))));

  const questions = await prisma.lessonQuestion.findMany({
    include: { translations: true, block: { include: { lesson: true } } },
  });
  gaps.push(...gapsOf("lessonQuestion", questions.map((q) => ({
    id: q.id, label: `${q.block.lesson.slug}#${q.block.order}`, locales: q.translations.map((t) => t.locale),
  }))));

  const options = await prisma.lessonQuestionOption.findMany({
    include: { translations: true, question: { include: { block: { include: { lesson: true } } } } },
  });
  gaps.push(...gapsOf("lessonQuestionOption", options.map((o) => ({
    id: o.id,
    label: `${o.question.block.lesson.slug}#${o.question.block.order} opt${o.order} ${o.glyph ?? ""}`,
    locales: o.translations.map((t) => t.locale),
  }))));

  const games = await prisma.game.findMany({ include: { translations: true } });
  gaps.push(...gapsOf("game", games.map((g) => ({
    id: g.id, label: g.slug, locales: g.translations.map((t) => t.locale),
  }))));

  const gameQuestions = await prisma.gameQuestion.findMany({
    include: { translations: true, game: true },
  });
  gaps.push(...gapsOf("gameQuestion", gameQuestions.map((q) => ({
    id: q.id, label: `${q.game.slug} q${q.order}`, locales: q.translations.map((t) => t.locale),
  }))));

  const gameOptions = await prisma.gameQuestionOption.findMany({
    include: { translations: true, question: { include: { game: true } } },
  });
  gaps.push(...gapsOf("gameQuestionOption", gameOptions.map((o) => ({
    id: o.id,
    label: `${o.question.game.slug} q${o.question.order} opt${o.order} ${o.glyph ?? ""}`,
    locales: o.translations.map((t) => t.locale),
  }))));

  const achievements = await prisma.achievement.findMany({ include: { translations: true } });
  gaps.push(...gapsOf("achievement", achievements.map((a) => ({
    id: a.id, label: a.code, locales: a.translations.map((t) => t.locale),
  }))));

  const rewards = await prisma.reward.findMany({ include: { translations: true } });
  gaps.push(...gapsOf("reward", rewards.map((r) => ({
    id: r.id, label: r.code, locales: r.translations.map((t) => t.locale),
  }))));

  // Second pass: rows that exist but merely repeat the English text. Numbers,
  // single letters and glyph-like values are legitimately identical.
  const identical: Array<{ entity: string; label: string; locale: string; text: string }> = [];
  const trivial = (value: string) => /^[\d\s.,:%+-]*$/.test(value) || value.length <= 2;

  function compareSets(
    entity: string,
    rows: Array<{ label: string; byLocale: Map<string, string> }>,
  ) {
    for (const row of rows) {
      const en = row.byLocale.get("en");
      if (!en || trivial(en)) continue;
      for (const locale of ["uz", "ru"]) {
        const value = row.byLocale.get(locale);
        if (value !== undefined && value === en) {
          identical.push({ entity, label: row.label, locale, text: en });
        }
      }
    }
  }

  compareSets("lessonQuestionOption.label", options.map((o) => ({
    label: `${o.question.block.lesson.slug}#${o.question.block.order} opt${o.order}`,
    byLocale: new Map(o.translations.map((t) => [t.locale.toLowerCase(), t.label])),
  })));
  compareSets("gameQuestionOption.label", gameOptions.map((o) => ({
    label: `${o.question.game.slug} q${o.question.order} opt${o.order}`,
    byLocale: new Map(o.translations.map((t) => [t.locale.toLowerCase(), t.label])),
  })));
  compareSets("lessonBlock.title", blocks.map((b) => ({
    label: `${b.lesson.slug}#${b.order}`,
    byLocale: new Map(b.translations.map((t) => [t.locale.toLowerCase(), t.title ?? ""])),
  })));
  compareSets("lessonBlock.body", blocks.map((b) => ({
    label: `${b.lesson.slug}#${b.order}`,
    byLocale: new Map(b.translations.map((t) => [t.locale.toLowerCase(), t.body ?? ""])),
  })));
  compareSets("lessonBlock.sayIt", blocks.map((b) => ({
    label: `${b.lesson.slug}#${b.order}`,
    byLocale: new Map(b.translations.map((t) => [t.locale.toLowerCase(), t.sayIt ?? ""])),
  })));
  compareSets("lessonQuestion.prompt", questions.map((q) => ({
    label: `${q.block.lesson.slug}#${q.block.order}`,
    byLocale: new Map(q.translations.map((t) => [t.locale.toLowerCase(), t.prompt])),
  })));
  compareSets("gameQuestion.prompt", gameQuestions.map((q) => ({
    label: `${q.game.slug} q${q.order}`,
    byLocale: new Map(q.translations.map((t) => [t.locale.toLowerCase(), t.prompt])),
  })));

  if (identical.length > 0) {
    console.log(`SAME-AS-ENGLISH: ${identical.length}`);
    for (const hit of identical) console.log(`  ${hit.entity}  ${hit.label}  [${hit.locale}] "${hit.text}"`);
  }

  if (gaps.length === 0 && identical.length === 0) {
    console.log("COMPLETE: every content row has real en, uz and ru translations.");
  } else {
    console.log(`GAPS: ${gaps.length}`);
    for (const gap of gaps) {
      console.log(`  ${gap.entity}  ${gap.label}  missing=[${gap.missing.join(",")}]`);
    }
  }
  await prisma.$disconnect();
  process.exit(gaps.length === 0 && identical.length === 0 ? 0 : 1);
}

void main();
