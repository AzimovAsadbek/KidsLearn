"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import { useChildContext } from "@/components/providers/child-provider";
import { fetchGames, fetchLessons, fetchRecommendation, queryKeys } from "@/lib/api/queries";
import { kidNav } from "@/config/navigation";
import { Mascot, MascotSays } from "@/components/kid/mascot";
import { GameCard, LessonCard } from "@/features/catalog/cards";
import { ProgressRing } from "@/components/ui/progress";
import { KidLoading } from "@/components/kid/kid-loading";
import { KidVoiceHelper } from "@/features/voice/kid-voice-helper";
import { useSound } from "@/hooks/use-sound";

/**
 * The child's home. Everything on it is scoped by the API to the selected
 * child: the lesson rail respects their age band and progress, the games are
 * published-only, and the goal ring reads the live daily bucket.
 */
export function KidHome() {
  const t = useT();
  const { locale } = useI18n();
  const { selectedChild, loading } = useChildContext();
  const play = useSound();

  const childId = selectedChild?.id;

  const lessons = useQuery({
    queryKey: [...queryKeys.lessons({ childId, purpose: "kid-home" }), locale],
    queryFn: () => fetchLessons({ childId: childId as string, limit: 24, locale }),
    enabled: Boolean(childId),
  });

  const games = useQuery({
    queryKey: [...queryKeys.games({ childId, purpose: "kid-home" }), locale],
    queryFn: () => fetchGames({ childId: childId as string, limit: 6, locale }),
    enabled: Boolean(childId),
  });

  const recommendation = useQuery({
    queryKey: queryKeys.recommendation(childId ?? "none"),
    queryFn: () => fetchRecommendation(childId as string),
    enabled: Boolean(childId),
  });

  /**
   * "Continue learning": started-but-unfinished first (most progress first),
   * topped up with fresh lessons so the rail never looks empty.
   */
  const rail = useMemo(() => {
    const all = lessons.data?.items ?? [];
    const inProgress = all
      .filter((lesson) => (lesson.progress?.percent ?? 0) > 0 && !lesson.progress?.completedAt)
      .sort((a, b) => (b.progress?.percent ?? 0) - (a.progress?.percent ?? 0));
    const fresh = all.filter((lesson) => !lesson.progress || lesson.progress.percent === 0);
    return [...inProgress, ...fresh].slice(0, 4);
  }, [lessons.data]);

  if (loading || !selectedChild) return <KidLoading />;

  const progress = selectedChild.progress;
  const goalDone = progress?.todayLessons ?? 0;
  const goalTotal = Math.max(1, selectedChild.dailyGoalLessons);
  const goalPercent = Math.min(100, Math.round((goalDone / goalTotal) * 100));

  const startHref = recommendation.data?.lessonSlug
    ? `/kids/lessons/${recommendation.data.lessonSlug}`
    : rail[0]
      ? `/kids/lessons/${rail[0].slug}`
      : "/kids/lessons";

  return (
    <div className="space-y-8">
      {/* ---- Hero ---------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-border bg-surface/80 p-5 shadow-soft backdrop-blur sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[clamp(1.7rem,5vw,2.6rem)] font-extrabold leading-tight text-content">
              {t("kid.hi", { name: selectedChild.name })}{" "}
              <span className="inline-block animate-wiggle" aria-hidden>
                👋
              </span>
            </h1>
            <p className="t-body mt-1 font-semibold text-content-secondary">{t("kid.letsLearn")}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={startHref}
                onClick={() => play("tap")}
                className="tactile inline-flex h-14 items-center gap-2 rounded-2xl bg-primary px-6 text-base font-extrabold text-primary-on shadow-[0_5px_0_0_var(--color-brand-700)]"
              >
                <span aria-hidden className="text-xl">
                  ▶
                </span>
                {t("kid.start")}
              </Link>

              <div className="flex items-center gap-3 rounded-2xl border-2 border-border bg-surface px-4 py-2">
                <ProgressRing value={goalPercent} size={44} thickness={6} tone="mint" label={`${goalPercent}%`}>
                  <span className="text-[0.6875rem] font-extrabold text-content tabular-nums">{goalDone}</span>
                </ProgressRing>
                <div>
                  <p className="t-caption font-bold text-content">{t("kid.dailyGoal")}</p>
                  <p className="t-caption text-content-secondary tabular-nums">
                    {goalDone} / {goalTotal}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 self-center">
            <Mascot size={150} mood={goalPercent >= 100 ? "cheer" : "happy"} />
          </div>
        </div>
      </section>

      {/* ---- Big nav tiles -------------------------------------------------- */}
      <section aria-labelledby="kid-explore">
        <h2 id="kid-explore" className="sr-only">
          {t("kid.explore")}
        </h2>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4">
          {kidNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => play("tap")}
                className="tactile flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-surface p-3 shadow-soft sm:p-4"
              >
                <span
                  className={cn(
                    "grid h-14 w-14 place-items-center rounded-2xl text-3xl sm:h-16 sm:w-16 sm:text-4xl",
                    toneStyles[item.tone].soft,
                  )}
                  aria-hidden
                >
                  {item.glyph}
                </span>
                <span className="font-display text-xs font-extrabold text-content sm:text-sm">{t(item.labelKey)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Continue learning ---------------------------------------------- */}
      <section aria-labelledby="kid-continue">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="kid-continue" className="font-display text-xl font-extrabold text-content sm:text-2xl">
            {t("kid.continueLearning")}
          </h2>
          <Link href="/kids/lessons" className="t-label text-primary hover:underline">
            {t("common.viewAll")}
          </Link>
        </div>

        {lessons.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-56 rounded-2xl" />
            ))}
          </div>
        ) : rail.length === 0 ? (
          <p className="t-body-sm rounded-2xl border-2 border-dashed border-border-strong bg-surface/60 p-6 text-center font-semibold text-content-secondary">
            {t("kid.noLessonsYet")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rail.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} variant="kid" />
            ))}
          </div>
        )}
      </section>

      {/* ---- Popular games -------------------------------------------------- */}
      <section aria-labelledby="kid-games">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="kid-games" className="font-display text-xl font-extrabold text-content sm:text-2xl">
            {t("kid.popularGames")}
          </h2>
          <Link href="/kids/games" className="t-label text-primary hover:underline">
            {t("common.viewAll")}
          </Link>
        </div>

        {games.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="shimmer h-40 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
            {(games.data?.items ?? []).map((game) => (
              <GameCard key={game.id} game={game} variant="kid" />
            ))}
          </div>
        )}
      </section>

      {/* ---- Mascot tip + voice help ---------------------------------------- */}
      <section className="flex flex-wrap items-end gap-4 rounded-3xl border-2 border-border bg-surface/80 p-5 backdrop-blur">
        <Mascot size={92} mood="think" float={false} className="shrink-0" />
        <MascotSays className="min-w-56 flex-1">{recommendation.data?.headline ?? t("kid.letsLearn")}</MascotSays>
        <KidVoiceHelper />
      </section>
    </div>
  );
}
