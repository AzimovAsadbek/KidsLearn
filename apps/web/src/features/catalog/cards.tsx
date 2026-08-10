"use client";

import Link from "next/link";
import { Clock, Play, Users } from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import type { GameDto, LessonDto } from "@kidslearn/types";
import { Badge, DifficultyBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";

const DIFFICULTY_KEY = {
  EASY: "lesson.difficultyEasy",
  MEDIUM: "lesson.difficultyMedium",
  HARD: "lesson.difficultyHard",
} as const;

type ApiDifficulty = keyof typeof DIFFICULTY_KEY;

function toneOf(tone: string | null | undefined) {
  return toneStyles[(tone ?? "brand") as Tone] ?? toneStyles.brand;
}

/** "AGE_3_4" → "3–4" for display. */
function ageLabel(ageCategory: string): string {
  return ageCategory.replace("AGE_", "").replace("_", "–");
}

/** The design system's lowercase difficulty prop from the API's enum. */
function difficultyProp(difficulty: string): "easy" | "medium" | "hard" {
  return difficulty.toLowerCase() as "easy" | "medium" | "hard";
}

/**
 * Lesson tile. `kid` renders the oversized, tactile variant for the child app;
 * the default is the denser card parents browse. Both consume the API DTO —
 * subject name and progress arrive already resolved for the active locale.
 */
export function LessonCard({
  lesson,
  variant = "default",
  href,
}: {
  lesson: LessonDto;
  variant?: "default" | "kid";
  href?: string;
}) {
  const t = useT();
  const target = href ?? `/kids/lessons/${lesson.slug}`;
  const style = toneOf(lesson.tone);
  const percent = lesson.progress?.percent ?? 0;
  const difficultyKey = DIFFICULTY_KEY[lesson.difficulty as ApiDifficulty] ?? DIFFICULTY_KEY.EASY;

  if (variant === "kid") {
    return (
      <Link
        href={target}
        className="tactile group flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-soft hover:shadow-card"
      >
        <div className={cn("relative grid h-32 place-items-center overflow-hidden sm:h-36", style.soft)}>
          {lesson.coverMediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lesson.coverMediaUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="text-6xl transition-transform duration-300 group-hover:scale-110" aria-hidden>
              {lesson.glyph}
            </span>
          )}
          <span className="absolute right-3 top-3 rounded-full bg-surface/90 px-2 py-1 text-xs font-bold text-content shadow-soft">
            ⏱ {t("lesson.duration", { minutes: lesson.durationMinutes })}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-display text-lg font-extrabold leading-tight text-content">{lesson.title}</h3>
          <p className="t-caption mt-1 font-semibold text-content-secondary">
            {lesson.subject?.name ?? ""} · {t(difficultyKey)}
          </p>
          <div className="mt-auto pt-3">
            <ProgressBar
              value={percent}
              tone={(lesson.tone as Tone) ?? "brand"}
              size="md"
              showValue
              label={t("nav.progress")}
            />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={target}
      className="group flex gap-4 rounded-xl border border-border bg-surface p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
    >
      <span className={cn("grid h-16 w-16 shrink-0 place-items-center rounded-lg text-3xl", style.soft)} aria-hidden>
        {lesson.glyph}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="t-h4 truncate text-content">{lesson.title}</h3>
          <span className="shrink-0">
            <DifficultyBadge difficulty={difficultyProp(lesson.difficulty)} label={t(difficultyKey)} />
          </span>
        </div>
        <p className="t-caption mt-1 line-clamp-2 text-content-secondary">{lesson.description}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {lesson.subject ? (
            <span className="t-caption flex items-center gap-1 font-semibold text-content-secondary">
              <span className={cn("h-2 w-2 rounded-full", toneOf(lesson.subject.tone).solid)} aria-hidden />
              {lesson.subject.name}
            </span>
          ) : null}
          <span className="t-caption flex items-center gap-1 text-content-tertiary">
            <Clock className="h-3 w-3" aria-hidden />
            {t("lesson.duration", { minutes: lesson.durationMinutes })}
          </span>
          <span className="t-caption text-content-tertiary">
            {t("lesson.age", { band: ageLabel(lesson.ageCategory) })}
          </span>
        </div>

        {lesson.progress ? (
          <div className="mt-3">
            <ProgressBar value={percent} tone={(lesson.tone as Tone) ?? "brand"} size="sm" />
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function GameCard({
  game,
  variant = "default",
  href,
}: {
  game: GameDto;
  variant?: "default" | "kid";
  href?: string;
}) {
  const t = useT();
  const target = href ?? `/kids/games/${game.slug}`;
  const style = toneOf(game.tone);
  const difficultyKey = DIFFICULTY_KEY[game.difficulty as ApiDifficulty] ?? DIFFICULTY_KEY.EASY;

  if (variant === "kid") {
    return (
      <Link
        href={target}
        className="tactile group flex flex-col items-center rounded-2xl border-2 border-border bg-surface p-4 text-center shadow-soft hover:shadow-card"
      >
        <span
          className={cn(
            "grid h-20 w-20 place-items-center rounded-2xl text-4xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110",
            style.soft,
          )}
          aria-hidden
        >
          {game.glyph}
        </span>
        <h3 className="mt-3 font-display text-base font-extrabold leading-tight text-content">{game.title}</h3>
        <span className="t-caption mt-1 font-semibold text-content-secondary">{game.subject?.name ?? ""}</span>
      </Link>
    );
  }

  return (
    <Link
      href={target}
      className="group flex flex-col rounded-xl border border-border bg-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("grid h-14 w-14 place-items-center rounded-lg text-3xl", style.soft)} aria-hidden>
          {game.glyph}
        </span>
        <span className="flex flex-col items-end gap-1.5">
          <DifficultyBadge difficulty={difficultyProp(game.difficulty)} label={t(difficultyKey)} />
          <Badge tone="sky" size="sm">
            {t("lesson.age", { band: ageLabel(game.ageCategory) })}
          </Badge>
        </span>
      </div>

      <h3 className="t-h4 mt-3 text-content">{game.title}</h3>
      <p className="t-caption mt-1 flex-1 text-content-secondary">{game.description}</p>

      <dl className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-content-tertiary" aria-hidden />
          <dt className="sr-only">{t("game.plays")}</dt>
          <dd className="t-caption font-semibold text-content-secondary tabular-nums">{formatCompact(game.plays)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="t-caption text-content-tertiary">{t("game.completion")}</dt>
          <dd className="t-caption font-bold text-content tabular-nums">{game.completionRate}%</dd>
        </div>
        <span className="t-label inline-flex items-center gap-1 text-primary">
          <Play className="h-3.5 w-3.5" aria-hidden />
          {t("kid.play")}
        </span>
      </dl>
    </Link>
  );
}
