"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn, formatDuration, formatRelativeTime } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { ActivityEvent, AiRecommendation, Child, SubjectStrength } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Mascot } from "@/components/kid/mascot";
import { getSubject } from "@/data/subjects";
import { NOW } from "@/data/children";
import type { SessionGains } from "@/store/app-store";

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

export function ParentStatRow({ child, gains }: { child: Child; gains: SessionGains }) {
  const t = useT();
  const minutesToday = 35 + gains.minutes;
  const lessonsToday = 4 + gains.lessonsCompleted;
  const stars = child.stars + gains.stars;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        tone="sky"
        glyph="⏱️"
        label={t("parent.todaysActivity")}
        value={minutesToday}
        unit={t("common.minutes")}
        delta={{ value: 20, suffix: ` ${t("common.minutes")}`, label: t("parent.vsYesterday", { value: "" }).trim() }}
      />
      <StatCard
        tone="mint"
        glyph="📗"
        label={t("parent.lessonsCompleted")}
        value={lessonsToday}
        delta={{ value: 2, suffix: "", label: t("parent.vsYesterday", { value: "" }).trim() }}
      />
      <StatCard
        tone="sun"
        glyph="⭐"
        label={t("parent.starsEarned")}
        value={stars}
        delta={{ value: 32, suffix: "", label: t("parent.vsYesterday", { value: "" }).trim() }}
      />
      <StatCard
        tone="coral"
        glyph="🔥"
        label={t("parent.currentStreak")}
        value={child.streakDays}
        unit={t("common.days")}
        footnote={t("parent.bestStreak", { days: child.bestStreak })}
      />
    </div>
  );
}

/* --- Subject strength ---------------------------------------------------- */

export function SubjectStrengthCard({ strengths }: { strengths: SubjectStrength[] }) {
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
        {strengths.map((entry) => {
          const subject = getSubject(entry.subjectId);
          return (
            <div key={entry.subjectId}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="t-body-sm flex min-w-0 items-center gap-2 font-semibold text-content">
                  <span
                    className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-[0.45rem] text-xs", toneStyles[subject.tone].soft)}
                    aria-hidden
                  >
                    {subject.glyph}
                  </span>
                  <span className="truncate">{subject.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn("t-caption font-bold", entry.trend >= 0 ? "text-success" : "text-danger")}
                    title={`${entry.trend >= 0 ? "Up" : "Down"} ${Math.abs(entry.trend)} points this week`}
                  >
                    {entry.trend >= 0 ? "▲" : "▼"}
                    {Math.abs(entry.trend)}
                  </span>
                  <span className="t-body-sm font-bold text-content tabular-nums">{entry.score}%</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-700", toneStyles[subject.tone].solid)}
                  style={{ width: `${entry.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

/* --- AI recommendation --------------------------------------------------- */

export function AiRecommendationCard({
  recommendation,
  childName,
  compact = false,
}: {
  recommendation: AiRecommendation;
  childName: string;
  compact?: boolean;
}) {
  const t = useT();

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
        action={<Badge tone="grape" size="sm">{t("ai.confidence", { value: recommendation.confidence })}</Badge>}
      />
      <CardBody className="relative flex flex-1 flex-col">
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
          <ButtonLink href={recommendation.href} size="md">
            {t("parent.startNow")}
          </ButtonLink>
          <span className="t-caption font-semibold text-content-secondary">
            ~{formatDuration(recommendation.minutes)} · {getSubject(recommendation.subjectId).name}
          </span>
        </div>
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
}: {
  events: ActivityEvent[];
  title: string;
  emptyLabel: string;
  limit?: number;
  href?: string;
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
        {shown.length === 0 ? (
          <p className="t-body-sm py-8 text-center text-content-secondary">{emptyLabel}</p>
        ) : (
          <ol className="relative space-y-1">
            {shown.map((event, index) => (
              <li key={event.id} className="relative flex gap-3.5 pb-4 last:pb-0">
                {index < shown.length - 1 ? (
                  <span className="absolute left-[1.1rem] top-10 bottom-0 w-px bg-border" aria-hidden />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-sm text-base",
                    toneStyles[event.tone].soft,
                  )}
                  aria-hidden
                >
                  {event.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="t-body-sm font-semibold text-content">{event.title}</p>
                  <p className="t-caption text-content-secondary">{event.detail}</p>
                  <p className="t-caption mt-1 flex flex-wrap items-center gap-2 text-content-tertiary">
                    <span>{formatRelativeTime(event.at, NOW, intlLocale)}</span>
                    {event.xp ? <span className="font-bold text-primary">+{event.xp} XP</span> : null}
                    {event.stars ? <span className="font-bold text-sun-deep dark:text-sun-core">+{event.stars} ⭐</span> : null}
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
