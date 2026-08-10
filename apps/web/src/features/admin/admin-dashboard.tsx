"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles } from "lucide-react";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";
import { toneStyles, TONES, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { AdminMetricsDto } from "@kidslearn/types";
import {
  fetchAdminAnalytics,
  fetchAdminMetrics,
  fetchAuditLog,
  fetchLessons,
  queryKeys,
} from "@/lib/api/queries";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader, ChartCard } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, InlineError } from "@/components/ui/states";
import { BarChart } from "@/components/charts/bar-chart";
import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";

const METRIC_CARDS = [
  { id: "totalUsers", labelKey: "admin.totalUsers", glyph: "👥", tone: "brand" },
  { id: "totalParents", labelKey: "admin.totalParents", glyph: "👪", tone: "sky" },
  { id: "totalChildren", labelKey: "admin.totalChildren", glyph: "🧒", tone: "mint" },
  { id: "totalLessons", labelKey: "admin.totalLessons", glyph: "📚", tone: "sun" },
  { id: "totalGames", labelKey: "admin.totalGames", glyph: "🎮", tone: "grape" },
  { id: "activeUsers", labelKey: "admin.activeUsers", glyph: "⚡", tone: "coral" },
] as const;

const AGE_KEY = { AGE_1_2: "age.band1_2", AGE_3_4: "age.band3_4", AGE_5_7: "age.band5_7" } as const;

/** Audit rows carry a machine resource name; this picks its illustration. */
const RESOURCE_STYLE: Record<string, { glyph: string; tone: Tone }> = {
  lesson: { glyph: "📚", tone: "sun" },
  media: { glyph: "🖼️", tone: "sky" },
  notification: { glyph: "📣", tone: "brand" },
  user: { glyph: "👤", tone: "mint" },
  feature_flag: { glyph: "🚩", tone: "coral" },
  subject: { glyph: "🎨", tone: "blossom" },
  category: { glyph: "🗂️", tone: "lagoon" },
  ai_job: { glyph: "🤖", tone: "grape" },
  child: { glyph: "🧒", tone: "mint" },
};

function toneOf(tone: string): Tone {
  return (TONES as readonly string[]).includes(tone) ? (tone as Tone) : "brand";
}

export function AdminDashboard() {
  const t = useT();
  const { intlLocale, locale } = useI18n();

  const metrics = useQuery({ queryKey: queryKeys.adminMetrics, queryFn: fetchAdminMetrics });
  const analytics = useQuery({ queryKey: queryKeys.adminAnalytics, queryFn: fetchAdminAnalytics });
  const audit = useQuery({
    queryKey: queryKeys.auditLog({ page: 1, limit: 8 }),
    queryFn: () => fetchAuditLog({ page: 1, limit: 8 }),
  });
  const reviewQueue = useQuery({
    queryKey: [...queryKeys.lessons({ status: "REVIEW", purpose: "dashboard" }), locale],
    queryFn: () => fetchLessons({ status: "REVIEW", page: 1, limit: 6, locale }),
  });

  const subjectShare = analytics.data?.subjectShare ?? [];
  const totalAnswers = subjectShare.reduce((sum, slice) => sum + slice.value, 0);
  const donutSlices = subjectShare.map((slice) => ({
    label: slice.label,
    value: slice.value,
    tone: toneOf(slice.tone),
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
        {metrics.isLoading ? (
          METRIC_CARDS.map((metric) => <div key={metric.id} className="shimmer h-32 rounded-xl" />)
        ) : metrics.isError ? (
          <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-6">
            <InlineError message={t("state.errorBody")} onRetry={() => void metrics.refetch()} retryLabel={t("common.retry")} />
          </div>
        ) : (
          METRIC_CARDS.map((metric) => {
            const value = metrics.data?.[metric.id as keyof AdminMetricsDto] as number;
            const delta = metrics.data?.deltas?.[metric.id];
            return (
              <StatCard
                key={metric.id}
                tone={metric.tone}
                glyph={metric.glyph}
                label={t(metric.labelKey)}
                value={formatNumber(value ?? 0, intlLocale)}
                delta={typeof delta === "number" ? { value: delta, suffix: "%" } : undefined}
                footnote={metric.id === "activeUsers" ? t("admin.activeUsersHint") : undefined}
              />
            );
          })
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard title={t("admin.platformStatistics")} subtitle={t("admin.dailyActivitySubtitle")}>
          {analytics.isLoading ? (
            <div className="shimmer h-56 rounded-lg" />
          ) : analytics.isError ? (
            <InlineError message={t("state.errorBody")} onRetry={() => void analytics.refetch()} retryLabel={t("common.retry")} />
          ) : (analytics.data?.dailyActivity.length ?? 0) === 0 ? (
            <EmptyState compact glyph="📈" title={t("admin.noDataTitle")} body={t("admin.noDataBody")} />
          ) : (
            <AreaChart
              points={analytics.data?.dailyActivity ?? []}
              tone="brand"
              ariaLabel={t("admin.platformStatistics")}
              summaryLabel={t("admin.dailyActivitySubtitle")}
            />
          )}
        </ChartCard>

        <ChartCard title={t("admin.topSubjects")} subtitle={t("admin.topSubjectsSubtitle")}>
          {analytics.isLoading ? (
            <div className="shimmer h-56 rounded-lg" />
          ) : analytics.isError ? (
            <InlineError message={t("state.errorBody")} onRetry={() => void analytics.refetch()} retryLabel={t("common.retry")} />
          ) : donutSlices.length === 0 ? (
            <EmptyState compact glyph="🥧" title={t("admin.noDataTitle")} body={t("admin.noDataBody")} />
          ) : (
            <DonutChart
              slices={donutSlices}
              ariaLabel={t("admin.topSubjects")}
              centre={
                <div>
                  <p className="t-h2 font-extrabold text-content">{formatNumber(totalAnswers, intlLocale)}</p>
                  <p className="t-caption font-semibold text-content-secondary">{t("admin.answersLabel")}</p>
                </div>
              }
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <ChartCard title={t("admin.userGrowth")} subtitle={t("admin.userGrowthSubtitle")}>
          {analytics.isLoading ? (
            <div className="shimmer h-48 rounded-lg" />
          ) : analytics.isError ? (
            <InlineError message={t("state.errorBody")} onRetry={() => void analytics.refetch()} retryLabel={t("common.retry")} />
          ) : (analytics.data?.userGrowth.length ?? 0) === 0 ? (
            <EmptyState compact glyph="📊" title={t("admin.noDataTitle")} body={t("admin.noDataBody")} />
          ) : (
            <BarChart points={analytics.data?.userGrowth ?? []} tone="grape" ariaLabel={t("admin.userGrowth")} />
          )}
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader
            title={t("admin.recentActivity")}
            action={
              <Link href="/admin/settings" className="t-label text-primary hover:underline">
                {t("common.viewAll")}
              </Link>
            }
          />
          <CardBody className="flex-1">
            {audit.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="shimmer h-9 rounded-sm" />
                ))}
              </div>
            ) : audit.isError ? (
              <InlineError message={t("state.errorBody")} onRetry={() => void audit.refetch()} retryLabel={t("common.retry")} />
            ) : (audit.data?.items.length ?? 0) === 0 ? (
              <EmptyState compact glyph="🗒️" title={t("state.emptyTitle")} body={t("state.emptyBody")} />
            ) : (
              <ul className="space-y-3">
                {(audit.data?.items ?? []).map((entry) => {
                  const style = RESOURCE_STYLE[entry.resource] ?? { glyph: "📌", tone: "brand" as Tone };
                  return (
                    <li key={entry.id} className="flex items-center gap-3">
                      <span
                        className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-sm text-base", toneStyles[style.tone].soft)}
                        aria-hidden
                      >
                        {style.glyph}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="t-body-sm block truncate font-semibold text-content">{entry.action}</span>
                        <span className="t-caption block truncate text-content-secondary">
                          {entry.userName ?? t("admin.systemActor")} · {entry.resource}
                        </span>
                      </span>
                      <span className="t-caption shrink-0 text-content-tertiary">
                        {formatRelativeTime(entry.createdAt, new Date(), intlLocale)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={t("admin.needsAttention")}
          subtitle={t("admin.needsAttentionSubtitle")}
          action={
            <Link href="/admin/lessons" className="t-label text-primary hover:underline">
              {t("common.viewAll")}
            </Link>
          }
        />
        <CardBody>
          {reviewQueue.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="shimmer h-12 rounded-sm" />
              ))}
            </div>
          ) : reviewQueue.isError ? (
            <InlineError message={t("state.errorBody")} onRetry={() => void reviewQueue.refetch()} retryLabel={t("common.retry")} />
          ) : (reviewQueue.data?.items.length ?? 0) === 0 ? (
            <EmptyState compact glyph="✅" title={t("admin.reviewQueueEmptyTitle")} body={t("admin.reviewQueueEmptyBody")} />
          ) : (
            <ul className="divide-y divide-border">
              {(reviewQueue.data?.items ?? []).map((lesson) => (
                <li key={lesson.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm text-xl", toneStyles[toneOf(lesson.tone)].soft)}
                    aria-hidden
                  >
                    {lesson.glyph}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-body-sm block truncate font-semibold text-content">{lesson.title}</span>
                    <span className="t-caption block text-content-secondary">
                      {lesson.subject?.name ?? ""} · {t(AGE_KEY[lesson.ageCategory as keyof typeof AGE_KEY] ?? "age.band1_2")}
                    </span>
                  </span>
                  <StatusBadge status={lesson.status.toLowerCase() as "draft" | "review" | "published" | "archived"} />
                  <Link
                    href="/admin/lessons"
                    className="t-label rounded-sm border border-border px-3 py-1.5 text-content hover:bg-surface-muted"
                  >
                    {t("admin.review")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
