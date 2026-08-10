"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import { adminActivity, adminMetrics } from "@/data/admin";
import { dailyActivity, platformGrowth, subjectShare, userGrowthWeekly } from "@/data/analytics";
import { getSubject } from "@/data/subjects";
import { lessons } from "@/data/lessons";
import { NOW } from "@/data/children";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader, ChartCard } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ButtonLink } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/badge";
import { MultiLineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";

export function AdminDashboard() {
  const t = useT();
  const { intlLocale } = useI18n();
  const [growthRange, setGrowthRange] = useState<"month" | "week">("month");

  const donutSlices = subjectShare.map((slice) => ({
    label: slice.label,
    value: slice.value,
    tone: getSubject(slice.subjectId).tone,
  }));

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <PageHeading
        title={t("admin.dashboard")}
        subtitle={t("admin.welcome")}
        actions={
          <>
            <ButtonLink href="/admin/ai-generator" variant="secondary" leadingIcon={<Sparkles className="h-4 w-4" />}>
              {t("nav.aiGenerator")}
            </ButtonLink>
            <ButtonLink href="/admin/lessons" leadingIcon={<Plus className="h-4 w-4" />}>
              {t("admin.newLesson")}
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {adminMetrics.map((metric) => (
          <StatCard
            key={metric.id}
            tone={metric.tone}
            glyph={metric.glyph}
            label={t(metric.label as "admin.totalUsers")}
            value={formatNumber(metric.value, intlLocale)}
            delta={{ value: metric.deltaPercent, suffix: "%", label: "this month" }}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title={t("admin.platformStatistics")}
          subtitle="Users, lessons and games over time"
          action={
            <Tabs
              variant="segmented"
              ariaLabel="Range"
              value={growthRange}
              onChange={setGrowthRange}
              items={[
                { id: "month", label: t("common.thisMonth") },
                { id: "week", label: t("common.thisWeek") },
              ]}
            />
          }
        >
          {growthRange === "month" ? (
            <MultiLineChart series={platformGrowth} ariaLabel="Platform growth" />
          ) : (
            <AreaChart points={dailyActivity} tone="brand" ariaLabel="Daily active sessions" summaryLabel="Sessions per day" />
          )}
        </ChartCard>

        <ChartCard title={t("admin.topSubjects")} subtitle="Share of all completed activities">
          <DonutChart
            slices={donutSlices}
            ariaLabel="Subject share"
            centre={
              <div>
                <p className="t-h2 font-extrabold text-content">2,843</p>
                <p className="t-caption font-semibold text-content-secondary">activities</p>
              </div>
            }
          />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <ChartCard title={t("admin.userGrowth")} subtitle="New registrations by week">
          <BarChart points={userGrowthWeekly} tone="grape" ariaLabel="New users per week" />
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader
            title={t("admin.recentActivity")}
            action={
              <Link href="/admin/statistics" className="t-label text-primary hover:underline">
                {t("common.viewAll")}
              </Link>
            }
          />
          <CardBody className="flex-1">
            <ul className="space-y-3">
              {adminActivity.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3">
                  <span
                    className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-sm text-base", toneStyles[entry.tone].soft)}
                    aria-hidden
                  >
                    {entry.glyph}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-body-sm block truncate font-semibold text-content">{entry.title}</span>
                    <span className="t-caption block truncate text-content-secondary">{entry.detail}</span>
                  </span>
                  <span className="t-caption shrink-0 text-content-tertiary">
                    {formatRelativeTime(entry.at, NOW, intlLocale)}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Content needing attention"
          subtitle="Drafts and review items block publication"
          action={
            <Link href="/admin/lessons" className="t-label text-primary hover:underline">
              {t("common.viewAll")}
            </Link>
          }
        />
        <CardBody>
          <ul className="divide-y divide-border">
            {lessons
              .filter((lesson) => lesson.status !== "published")
              .map((lesson) => (
                <li key={lesson.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm text-xl", toneStyles[lesson.tone].soft)}
                    aria-hidden
                  >
                    {lesson.glyph}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-body-sm block truncate font-semibold text-content">{lesson.title}</span>
                    <span className="t-caption block text-content-secondary">
                      {getSubject(lesson.subjectId).name} · Ages {lesson.ageBand}
                    </span>
                  </span>
                  <StatusBadge status={lesson.status} />
                  <Link
                    href="/admin/lessons"
                    className="t-label rounded-sm border border-border px-3 py-1.5 text-content hover:bg-surface-muted"
                  >
                    Review
                  </Link>
                </li>
              ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
