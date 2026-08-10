"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import { useAppStore } from "@/store/app-store";
import { publishedLessons, progressFor } from "@/data/lessons";
import { games } from "@/data/games";
import { subjects } from "@/data/subjects";
import { activities, books, formatSeconds, videos } from "@/data/library";
import { GameCard, LessonCard } from "@/features/catalog/cards";
import { EmptyState } from "@/components/ui/states";
import { useSound } from "@/hooks/use-sound";

/** Big, friendly page header used by every child list screen. */
export function KidPageHeader({
  glyph,
  title,
  subtitle,
  children,
}: {
  glyph: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-5">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface text-3xl shadow-soft" aria-hidden>
          {glyph}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold text-content sm:text-3xl">{title}</h1>
          <p className="t-body-sm font-semibold text-content-secondary">{subtitle}</p>
        </div>
      </div>
      {children}
    </header>
  );
}

/** Subject chips — the only "filter" a five-year-old needs. */
function SubjectChips({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const play = useSound();
  return (
    <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onChange("")}
        aria-pressed={value === ""}
        className={cn(
          "shrink-0 rounded-full border-2 px-4 py-2 text-sm font-extrabold transition-colors",
          value === "" ? "border-primary bg-primary text-primary-on" : "border-border bg-surface text-content-secondary",
        )}
      >
        ✨ All
      </button>
      {subjects.map((subject) => {
        const active = subject.id === value;
        return (
          <button
            key={subject.id}
            type="button"
            onClick={() => {
              play("tap");
              onChange(subject.id);
            }}
            aria-pressed={active}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-extrabold transition-colors",
              active
                ? cn("border-transparent", toneStyles[subject.tone].soft, toneStyles[subject.tone].ink)
                : "border-border bg-surface text-content-secondary",
            )}
          >
            <span aria-hidden>{subject.glyph}</span>
            {subject.name}
          </button>
        );
      })}
    </div>
  );
}

export function KidLessonsView() {
  const t = useT();
  const childId = useAppStore((s) => s.selectedChildId);
  const [subjectId, setSubjectId] = useState("");
  const list = subjectId ? publishedLessons.filter((l) => l.subjectId === subjectId) : publishedLessons;

  return (
    <div>
      <KidPageHeader glyph="📚" title={t("nav.lessons")} subtitle="Pick something to learn today">
        <SubjectChips value={subjectId} onChange={setSubjectId} />
      </KidPageHeader>

      {list.length === 0 ? (
        <EmptyState glyph="📚" title="Nothing here yet" body="Try another subject!" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} percent={progressFor(childId, lesson.id)} variant="kid" />
          ))}
        </div>
      )}
    </div>
  );
}

export function KidGamesView() {
  const t = useT();
  const [subjectId, setSubjectId] = useState("");
  const list = subjectId ? games.filter((g) => g.subjectId === subjectId) : games;

  return (
    <div>
      <KidPageHeader glyph="🎮" title={t("nav.games")} subtitle="Play and collect stars">
        <SubjectChips value={subjectId} onChange={setSubjectId} />
      </KidPageHeader>

      {list.length === 0 ? (
        <EmptyState glyph="🎮" title="No games here" body="Try another subject!" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {list.map((game) => (
            <GameCard key={game.id} game={game} variant="kid" />
          ))}
        </div>
      )}
    </div>
  );
}

export function KidBooksView() {
  const t = useT();
  return (
    <div>
      <KidPageHeader glyph="📖" title={t("nav.books")} subtitle="Stories to read together" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {books.map((book) => (
          <article
            key={book.id}
            className="tactile flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-soft"
          >
            {/* A spine and a cover, so it reads as a book rather than a card */}
            <div className={cn("relative grid h-36 place-items-center", toneStyles[book.tone].soft)}>
              <span className="absolute left-0 top-0 h-full w-3 bg-black/10" aria-hidden />
              <span className="text-6xl" aria-hidden>
                {book.glyph}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h2 className="font-display text-base font-extrabold leading-tight text-content">{book.title}</h2>
              <p className="t-caption mt-1 font-semibold text-content-secondary">
                {book.pages} pages · {book.minutes} min
              </p>
              <button
                type="button"
                className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-soft text-sm font-extrabold text-primary"
              >
                <Play className="h-4 w-4" aria-hidden />
                Read
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function KidVideosView() {
  const t = useT();
  return (
    <div>
      <KidPageHeader glyph="🎬" title={t("nav.videos")} subtitle="Short songs and stories" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <article
            key={video.id}
            className="tactile overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-soft"
          >
            <div className={cn("relative grid h-40 place-items-center", toneStyles[video.tone].soft)}>
              <span className="text-6xl" aria-hidden>
                {video.glyph}
              </span>
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-surface/90 shadow-card">
                  <Play className="h-7 w-7 translate-x-0.5 text-primary" aria-hidden />
                </span>
              </span>
              <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                {formatSeconds(video.seconds)}
              </span>
            </div>
            <div className="p-4">
              <h2 className="font-display text-base font-extrabold text-content">{video.title}</h2>
              <p className="t-caption mt-0.5 font-semibold text-content-secondary">
                {video.views.toLocaleString()} plays
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

const ACTIVITY_LABEL = {
  draw: "Draw",
  trace: "Trace",
  sing: "Sing",
  move: "Move",
  build: "Build",
} as const;

export function KidActivitiesView() {
  const t = useT();
  return (
    <div>
      <KidPageHeader glyph="🎨" title={t("nav.activities")} subtitle="Things to do away from the screen" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((activity) => (
          <article
            key={activity.id}
            className={cn(
              "tactile flex items-center gap-4 rounded-2xl border-2 border-border p-4 shadow-soft",
              toneStyles[activity.tone].soft,
            )}
          >
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-surface/80 text-3xl" aria-hidden>
              {activity.glyph}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-extrabold leading-tight text-content">{activity.title}</h2>
              <p className="t-caption mt-0.5 font-bold text-content-secondary">
                {ACTIVITY_LABEL[activity.kind]} · {activity.minutes} min · {activity.ageBand} yrs
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border-2 border-dashed border-border-strong bg-surface/60 p-5 text-center">
        <p className="t-body-sm font-semibold text-content-secondary">
          Activities are printable. Ask a grown-up to open{" "}
          <Link href="/settings" className="font-bold text-primary hover:underline">
            settings
          </Link>{" "}
          to print this week&apos;s pack.
        </p>
      </div>
    </div>
  );
}
