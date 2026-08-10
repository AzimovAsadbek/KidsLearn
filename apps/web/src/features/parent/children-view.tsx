"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, Pencil, Plus, UserRound } from "lucide-react";
import { calculateAge, cn, formatDuration, formatRelativeTime } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { Child } from "@/types";
import { children as seedChildren, NOW } from "@/data/children";
import { getSubject } from "@/data/subjects";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/states";
import { AddChildModal } from "./add-child-modal";

export function ChildrenView() {
  const t = useT();
  const params = useSearchParams();
  const [addOpen, setAddOpen] = useState(params.get("add") === "1");
  const [added, setAdded] = useState<Child[]>([]);

  const all = [...seedChildren, ...added];

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

      {all.length === 0 ? (
        <EmptyState
          glyph="👶"
          title="No children yet"
          body="Add your first child and we'll tailor every lesson to their age."
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

      <AddChildModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={(child) => setAdded((current) => [...current, child])}
      />
    </div>
  );
}

export function ChildCard({ child }: { child: Child }) {
  const t = useT();
  const { intlLocale } = useI18n();
  const subject = getSubject(child.favouriteSubjectId);
  const levelPercent = Math.round((child.xp / child.xpToNextLevel) * 100);

  return (
    <Card className="group flex flex-col overflow-hidden" interactive>
      {/* Tinted hero keyed to the child's own avatar tone */}
      <div className={cn("relative h-24", toneStyles[child.avatar.tone].gradient)}>
        <div
          className="absolute inset-0 opacity-30"
          aria-hidden
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.6), transparent 55%)" }}
        />
        <div className="absolute -bottom-7 left-5">
          <Avatar spec={child.avatar} size="xl" className="ring-4 ring-surface" />
        </div>
        <div className="absolute right-4 top-4 flex gap-1.5">
          <Badge tone="sun" size="sm">
            🔥 {child.streakDays}
          </Badge>
          <Badge tone="brand" size="sm">
            Lv {child.level}
          </Badge>
        </div>
      </div>

      <CardBody className="flex flex-1 flex-col pt-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="t-h3 truncate text-content">{child.name}</h3>
            <p className="t-caption text-content-secondary">
              {calculateAge(child.birthDate, NOW)} years · {t("parent.lastActive", {
                time: formatRelativeTime(child.lastActiveAt, NOW, intlLocale),
              })}
            </p>
          </div>
          <span
            className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-sm text-lg", toneStyles[subject.tone].soft)}
            title={`Favourite subject: ${subject.name}`}
            aria-hidden
          >
            {subject.glyph}
          </span>
        </div>

        <div className="mt-4">
          <ProgressBar
            value={levelPercent}
            tone={child.avatar.tone}
            label={`Level ${child.level} → ${child.level + 1}`}
            showValue
          />
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-surface-muted p-3">
          {[
            { label: t("common.stars"), value: child.stars, glyph: "⭐" },
            { label: t("nav.lessons"), value: child.lessonsCompleted, glyph: "📗" },
            { label: "Time", value: formatDuration(child.minutesLearned), glyph: "⏱️" },
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
