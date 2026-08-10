"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn, formatDuration, formatRelativeTime } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { ActivityDto, ChildProgressDto, RecommendationDto, SubjectStrengthDto } from "@kidslearn/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Mascot } from "@/components/kid/mascot";
import { EmptyState, SkeletonCard } from "@/components/ui/states";

/** Tone names arrive from the API as strings; fall back if one is unknown. */
function toneOf(tone: string) {
  return toneStyles[tone as Tone] ?? toneStyles.brand;
}

/* --- Greeting ------------------------------------------------------------ */

export function ParentGreeting({ name, hour }: { name: string; hour: number }) {
  const t = useT();
  const key = hour < 12 ? "parent.greeting.morning" : hour < 18 ? "parent.greeting.afternoon" : "parent.greeting.evening";

  return (
    <div className="min-w-0">
      <h1 className="t-h1 flex flex-wrap items-center gap-2 text-content">
        {t(key, { name })}
        <span className="animate-wiggle inline-block" aria-hidden>
          👋
        </span>
      </h1>
      <p className="t-body mt-1 text-content-secondary">{t("parent.subtitle")}</p>
    </div>
  );
}

/* --- Stat row ------------------------------------------------------------ */

/** Every figure here comes from the API's materialised progress aggregate. */
export function ParentStatRow({ progress, childName }: { progress: ChildProgressDto; childName: string }) {
  const t = useT();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        tone="sky"
        glyph="⏱️"
        label={t("parent.todaysActivity")}
        value={Math.round(progress.todaySeconds / 60)}
        unit={t("common.minutes")}
        footnote={`${childName} · ${formatDuration(Math.round(progress.learningSeconds / 60))} in total`}
      />
      <StatCard
        tone="mint"
        glyph="📗"
        label={t("parent.lessonsCompleted")}
        value={progress.lessonsCompleted}
        footnote={`${progress.todayLessons} today`}
      />
      <StatCard
        tone="sun"
        glyph="⭐"
        label={t("parent.starsEarned")}
        value={progress.stars}
        footnote={`${progress.todayStars} today`}
      />
      <StatCard
        tone="coral"
        glyph="🔥"
        label={t("parent.currentStreak")}
        value={progress.currentStreak}
        unit={t("common.days")}
        footnote={t("parent.bestStreak", { days: progress.longestStreak })}
      />
    </div>
  );
}

/* --- Subject strength ---------------------------------------------------- */

export function SubjectStrengthCard({
  strengths,
  loading,
}: {
  strengths: SubjectStrengthDto[];
  loading?: boolean;
}) {
  const t = useT();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={t("parent.subjectStrength")}
        action={
          <Link href="/progress" className="t-label text-primary hover:underline">
            {t("common.viewAll")}
          </Link>
        }
      />
      <CardBody className="flex-1 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-8 rounded-sm" />
            ))}
          </div>
        ) : strengths.length === 0 ? (
          <p className="t-body-sm py-6 text-center text-content-secondary">
            Subject scores appear once a few questions have been answered.
          </p>
        ) : (
          strengths.map((entry) => (
            <div key={entry.subjectId}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="t-body-sm flex min-w-0 items-center gap-2 font-semibold text-content">
                  <span
                    className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-[0.45rem] text-xs", toneOf(entry.tone).soft)}
                    aria-hidden
                  >
                    {entry.glyph}
                  </span>
                  <span className="truncate">{entry.subjectName}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn("t-caption font-bold", entry.trend >= 0 ? "text-success" : "text-danger")}
                    title={`${entry.trend >= 0 ? "Up" : "Down"} ${Math.abs(entry.trend)} points`}
                  >
                    {entry.trend >= 0 ? "▲" : "▼"}
                    {Math.abs(entry.trend)}
                  </span>
                  <span className="t-body-sm font-bold text-content tabular-nums">{entry.score}%</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-700", toneOf(entry.tone).solid)}
                  style={{ width: `${entry.score}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

/* --- AI recommendation --------------------------------------------------- */

export function AiRecommendationCard({
  recommendation,
  childName,
  compact = false,
  loading,
}: {
  recommendation: RecommendationDto | null;
  childName: string;
  compact?: boolean;
  loading?: boolean;
}) {
  const t = useT();

  if (loading) return <SkeletonCard className="h-64" />;

  return (
    <Card className="relative flex flex-col overflow-hidden">
      {/* A restrained AI signature: a soft aurora, not a chat interface. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(320px 160px at 88% 0%, color-mix(in oklab, var(--color-grape-soft) 90%, transparent), transparent 70%)",
        }}
      />
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-[0.5rem] bg-grape-soft dark:bg-grape-core/20">
              <Sparkles className="h-4 w-4 text-grape-deep dark:text-grape-core" aria-hidden />
            </span>
            {t("parent.recommendedFor", { name: childName })}
          </span>
        }
        action={
          recommendation ? (
            <Badge tone={recommendation.source === "AI" ? "grape" : "sky"} size="sm">
              {recommendation.source === "AI"
                ? t("ai.confidence", { value: recommendation.confidence })
                : "Rule-based"}
            </Badge>
          ) : undefined
        }
      />
      <CardBody className="relative flex flex-1 flex-col">
        {!recommendation ? (
          <p className="t-body-sm py-6 text-content-secondary">
            A recommendation appears once there is enough activity to base one on.
          </p>
        ) : (
          <>
            <div className={cn("flex gap-4", compact && "flex-col")}>
              {!compact ? (
                <div className="shrink-0">
                  <Mascot size={92} mood="think" float={false} />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="t-h3 text-balance text-content">{recommendation.headline}</p>
                <p className="t-body-sm mt-2 text-content-secondary">{recommendation.rationale}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ButtonLink
                href={recommendation.lessonSlug ? `/kids/lessons/${recommendation.lessonSlug}` : "/kids/lessons"}
                size="md"
              >
                {t("parent.startNow")}
              </ButtonLink>
              <span className="t-caption font-semibold text-content-secondary">
                ~{formatDuration(recommendation.minutes)}
                {recommendation.subjectName ? ` · ${recommendation.subjectName}` : ""}
              </span>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

/* --- Activity feed ------------------------------------------------------- */

export function ActivityFeed({
  events,
  title,
  emptyLabel,
  limit,
  href,
  loading,
}: {
  events: ActivityDto[];
  title: string;
  emptyLabel: string;
  limit?: number;
  href?: string;
  loading?: boolean;
}) {
  const t = useT();
  const { intlLocale } = useI18n();
  const shown = limit ? events.slice(0, limit) : events;

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        action={
          href ? (
            <Link href={href} className="t-label inline-flex items-center gap-1 text-primary hover:underline">
              {t("common.viewAll")}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : undefined
        }
      />
      <CardBody className="flex-1">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-12 rounded-sm" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState compact glyph="🌱" title="Nothing yet" body={emptyLabel} />
        ) : (
          <ol className="relative space-y-1">
            {shown.map((event, index) => (
              <li key={event.id} className="relative flex gap-3.5 pb-4 last:pb-0">
                {index < shown.length - 1 ? (
                  <span className="absolute left-[1.1rem] top-10 bottom-0 w-px bg-border" aria-hidden />
                ) : null}
                <span
                  className={cn("relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-sm text-base", toneOf(event.tone).soft)}
                  aria-hidden
                >
                  {event.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="t-body-sm font-semibold text-content">{event.title}</p>
                  <p className="t-caption text-content-secondary">{event.detail}</p>
                  <p className="t-caption mt-1 flex flex-wrap items-center gap-2 text-content-tertiary">
                    <span>{formatRelativeTime(event.createdAt, new Date(), intlLocale)}</span>
                    {event.xp ? <span className="font-bold text-primary">+{event.xp} XP</span> : null}
                    {event.stars ? (
                      <span className="font-bold text-sun-deep dark:text-sun-core">+{event.stars} ⭐</span>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
