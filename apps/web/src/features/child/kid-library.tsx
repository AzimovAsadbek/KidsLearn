"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import { useChildContext } from "@/components/providers/child-provider";
import { fetchGames, fetchLessons, fetchSubjects, queryKeys } from "@/lib/api/queries";
import { activities, books, formatSeconds, videos } from "@/data/library";
import { GameCard, LessonCard } from "@/features/catalog/cards";
import { EmptyState } from "@/components/ui/states";
import { KidLoading } from "@/components/kid/kid-loading";
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

/** Subject chips — the only "filter" a five-year-old needs. Subjects come from the API in the child's locale. */
function SubjectChips({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const t = useT();
  const { locale } = useI18n();
  const play = useSound();

  const { data: subjects } = useQuery({
    queryKey: [...queryKeys.subjects, locale],
    queryFn: () => fetchSubjects(locale),
  });

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
        ✨ {t("common.all")}
      </button>
      {(subjects ?? []).map((subject) => {
        const active = subject.id === value;
        const tone = toneStyles[subject.tone as keyof typeof toneStyles] ?? toneStyles.brand;
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
                ? cn("border-transparent", tone.soft, tone.ink)
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
  const { locale } = useI18n();
  const { selectedChildId, loading } = useChildContext();
  const [subjectId, setSubjectId] = useState("");

  const lessons = useQuery({
    queryKey: [...queryKeys.lessons({ childId: selectedChildId, subjectId, purpose: "kid-lessons" }), locale],
    queryFn: () =>
      fetchLessons({
        childId: selectedChildId as string,
        subjectId: subjectId || undefined,
        limit: 48,
        locale,
      }),
    enabled: Boolean(selectedChildId),
  });

  if (loading) return <KidLoading />;

  return (
    <div>
      <KidPageHeader glyph="📚" title={t("nav.lessons")} subtitle={t("kid.lessonsSubtitle")}>
        <SubjectChips value={subjectId} onChange={setSubjectId} />
      </KidPageHeader>

      {lessons.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-56 rounded-2xl" />
          ))}
        </div>
      ) : (lessons.data?.items.length ?? 0) === 0 ? (
        <EmptyState glyph="📚" title={t("kid.emptyShelfTitle")} body={t("kid.emptyShelfBody")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(lessons.data?.items ?? []).map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} variant="kid" />
          ))}
        </div>
      )}
    </div>
  );
}

export function KidGamesView() {
  const t = useT();
  const { locale } = useI18n();
  const { selectedChildId, loading } = useChildContext();
  const [subjectId, setSubjectId] = useState("");

  const games = useQuery({
    queryKey: [...queryKeys.games({ childId: selectedChildId, subjectId, purpose: "kid-games" }), locale],
    queryFn: () =>
      fetchGames({
        childId: selectedChildId as string,
        subjectId: subjectId || undefined,
        limit: 24,
        locale,
      }),
    enabled: Boolean(selectedChildId),
  });

  if (loading) return <KidLoading />;

  return (
    <div>
      <KidPageHeader glyph="🎮" title={t("nav.games")} subtitle={t("kid.gamesSubtitle")}>
        <SubjectChips value={subjectId} onChange={setSubjectId} />
      </KidPageHeader>

      {games.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-44 rounded-2xl" />
          ))}
        </div>
      ) : (games.data?.items.length ?? 0) === 0 ? (
        <EmptyState glyph="🎮" title={t("kid.emptyShelfTitle")} body={t("kid.emptyShelfBody")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {(games.data?.items ?? []).map((game) => (
            <GameCard key={game.id} game={game} variant="kid" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   Books, videos and activities are a curated starter shelf that ships with the
   product (static content in @/data/library, localised through the dictionary).
   They are not CMS-managed — there is deliberately no backend model for them.
   ========================================================================== */

export function KidBooksView() {
  const t = useT();
  const { plural } = useI18n();
  return (
    <div>
      <KidPageHeader glyph="📖" title={t("nav.books")} subtitle={t("kid.booksSubtitle")} />
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
                {plural("plural.pages", book.pages)} · {plural("plural.minutes", book.minutes)}
              </p>
              <button
                type="button"
                className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-soft text-sm font-extrabold text-primary"
              >
                <Play className="h-4 w-4" aria-hidden />
                {t("kid.read")}
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
  const { plural, intlLocale } = useI18n();
  return (
    <div>
      <KidPageHeader glyph="🎬" title={t("nav.videos")} subtitle={t("kid.videosSubtitle")} />
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
                {plural("plural.plays", video.views, { count: video.views.toLocaleString(intlLocale) })}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

const ACTIVITY_LABEL_KEY = {
  draw: "kid.activityDraw",
  trace: "kid.activityTrace",
  sing: "kid.activitySing",
  move: "kid.activityMove",
  build: "kid.activityBuild",
} as const;

export function KidActivitiesView() {
  const t = useT();
  const { plural } = useI18n();
  return (
    <div>
      <KidPageHeader glyph="🎨" title={t("nav.activities")} subtitle={t("kid.activitiesSubtitle")} />
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
                {t(ACTIVITY_LABEL_KEY[activity.kind])} · {plural("plural.minutes", activity.minutes)} ·{" "}
                {t("kid.ageBand", { band: activity.ageBand })}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border-2 border-dashed border-border-strong bg-surface/60 p-5 text-center">
        <p className="t-body-sm font-semibold text-content-secondary">
          {t("kid.printableHint")}{" "}
          <Link href="/settings" className="font-bold text-primary hover:underline">
            {t("common.settings")}
          </Link>
        </p>
      </div>
    </div>
  );
}
