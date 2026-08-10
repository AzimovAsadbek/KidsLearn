"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, Pencil, Plus, UserRound } from "lucide-react";
import { cn, formatDuration, formatRelativeTime } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { ChildDto } from "@kidslearn/types";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { EmptyState, SkeletonCard } from "@/components/ui/states";
import { fetchChildren, queryKeys } from "@/lib/api/queries";
import { AddChildModal } from "./add-child-modal";

export function ChildrenView() {
  const t = useT();
  const params = useSearchParams();
  const [addOpen, setAddOpen] = useState(params.get("add") === "1");

  const { data, isLoading } = useQuery({ queryKey: queryKeys.children, queryFn: fetchChildren });
  const all = data ?? [];

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <PageHeading
        title={t("parent.childrenTitle")}
        subtitle={t("parent.childrenSubtitle")}
        actions={
          <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
            {t("parent.addChild")}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-72" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          glyph="👶"
          title={t("parent.noChildrenTitle")}
          body={t("parent.noChildrenBody")}
          action={<Button onClick={() => setAddOpen(true)}>{t("parent.addChild")}</Button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {all.map((child) => (
            <ChildCard key={child.id} child={child} />
          ))}

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border-strong bg-surface p-6 text-content-secondary transition-colors hover:border-primary hover:text-primary"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-muted">
              <Plus className="h-6 w-6" aria-hidden />
            </span>
            <span className="t-h4">{t("parent.addChild")}</span>
            <span className="t-caption max-w-48 text-center text-content-tertiary">
              {t("parent.addChildSubtitle")}
            </span>
          </button>
        </div>
      )}

      <AddChildModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

export function ChildCard({ child }: { child: ChildDto }) {
  const t = useT();
  const { intlLocale } = useI18n();
  const progress = child.progress;
  const tone = child.avatarTone as Tone;
  const levelPercent = progress
    ? Math.round((progress.xpIntoLevel / Math.max(1, progress.xpForNextLevel)) * 100)
    : 0;

  return (
    <Card className="group flex flex-col overflow-hidden" interactive>
      {/* Tinted hero keyed to the child's own avatar tone */}
      <div className={cn("relative h-24", toneStyles[tone]?.gradient ?? toneStyles.brand.gradient)}>
        <div
          className="absolute inset-0 opacity-30"
          aria-hidden
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.6), transparent 55%)" }}
        />
        <div className="absolute -bottom-7 left-5">
          <Avatar spec={{ glyph: child.avatarGlyph, tone }} size="xl" className="ring-4 ring-surface" />
        </div>
        <div className="absolute right-4 top-4 flex gap-1.5">
          <Badge tone="sun" size="sm">
            🔥 {progress?.currentStreak ?? 0}
          </Badge>
          <Badge tone="brand" size="sm">
            {t("parent.levelShort")} {progress?.level ?? 1}
          </Badge>
        </div>
      </div>

      <CardBody className="flex flex-1 flex-col pt-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="t-h3 truncate text-content">{child.name}</h3>
            <p className="t-caption text-content-secondary">
              {t("parent.ageYears", { age: child.age })} ·{" "}
              {progress?.lastActivityAt
                ? t("parent.lastActive", { time: formatRelativeTime(progress.lastActivityAt, new Date(), intlLocale) })
                : t("parent.noActivityYet")}
            </p>
          </div>
          <span
            className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-sm text-lg", toneStyles[tone]?.soft ?? toneStyles.brand.soft)}
            title={t("parent.agesTitle", { band: child.ageCategory.replace("AGE_", "").replace("_", "–") })}
            aria-hidden
          >
            {child.avatarGlyph}
          </span>
        </div>

        <div className="mt-4">
          <ProgressBar
            value={levelPercent}
            tone={tone}
            label={t("parent.levelProgress", { from: progress?.level ?? 1, to: (progress?.level ?? 1) + 1 })}
            showValue
          />
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-surface-muted p-3">
          {[
            { label: t("common.stars"), value: progress?.stars ?? 0, glyph: "⭐" },
            { label: t("nav.lessons"), value: progress?.lessonsCompleted ?? 0, glyph: "📗" },
            { label: t("common.time"), value: formatDuration(Math.round((progress?.learningSeconds ?? 0) / 60)), glyph: "⏱️" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="t-caption text-content-secondary">
                <span aria-hidden className="mr-1">
                  {stat.glyph}
                </span>
                {stat.label}
              </dt>
              <dd className="t-h4 mt-0.5 text-content tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/children/${child.id}`}
            className="t-label inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-primary px-3 py-2.5 text-primary-on transition-colors hover:bg-primary-hover"
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            {t("parent.viewProfile")}
          </Link>
          <Link
            href="/progress"
            className="t-label inline-flex items-center justify-center gap-1.5 rounded-sm border border-border px-3 py-2.5 text-content transition-colors hover:bg-surface-muted"
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            {t("nav.progress")}
          </Link>
          <Link
            href="/settings"
            aria-label={`${t("common.edit")} ${child.name}`}
            className="inline-flex items-center justify-center rounded-sm border border-border px-3 py-2.5 text-content transition-colors hover:bg-surface-muted"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
