"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn, formatCompact, formatDuration, formatNumber, formatRelativeTime } from "@/lib/utils";
import { toneStyles, TONES, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { AuditLogDto, FeatureFlagKey, FeatureFlagsDto } from "@kidslearn/types";
import { ApiError } from "@/lib/api/client";
import {
  fetchAdminAnalytics,
  fetchAuditLog,
  fetchFeatureFlags,
  queryKeys,
  updateFeatureFlag,
} from "@/lib/api/queries";
import { useAppStore } from "@/store/app-store";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader, ChartCard } from "@/components/ui/card";
import { MiniStat } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { EmptyState, ErrorState, InlineError, SkeletonTable } from "@/components/ui/states";

function toneOf(tone: string): Tone {
  return (TONES as readonly string[]).includes(tone) ? (tone as Tone) : "brand";
}

/* --- Advanced analytics --------------------------------------------------- */

export function AdminAnalyticsView() {
  const t = useT();
  const { intlLocale } = useI18n();

  const analytics = useQuery({ queryKey: queryKeys.adminAnalytics, queryFn: fetchAdminAnalytics });
  const data = analytics.data;

  const miniStats = data
    ? ([
        { id: "dau", label: t("admin.dau"), glyph: "⚡", tone: "brand", value: formatNumber(data.dau, intlLocale) },
        { id: "wau", label: t("admin.wau"), glyph: "📅", tone: "sky", value: formatNumber(data.wau, intlLocale) },
        { id: "mau", label: t("admin.mau"), glyph: "🗓️", tone: "grape", value: formatNumber(data.mau, intlLocale) },
        { id: "lessons", label: t("admin.lessonCompletionRate"), glyph: "✅", tone: "mint", value: `${data.lessonCompletionRate}%` },
        { id: "games", label: t("admin.gameCompletionRate"), glyph: "🎮", tone: "sun", value: `${data.gameCompletionRate}%` },
        {
          id: "session",
          label: t("admin.avgSession"),
          glyph: "⏱️",
          tone: "lagoon",
          value: formatDuration(Math.round(data.averageSessionSeconds / 60)),
        },
      ] as const)
    : [];

  if (analytics.isError) {
    return (
      <div className="mx-auto w-full max-w-[100rem] space-y-6">
        <PageHeading title={t("nav.statistics")} subtitle={t("admin.analyticsSubtitle")} />
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void analytics.refetch()}>{t("common.retry")}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <PageHeading title={t("nav.statistics")} subtitle={t("admin.analyticsSubtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {analytics.isLoading
          ? Array.from({ length: 6 }, (_, i) => <div key={i} className="shimmer h-20 rounded-lg" />)
          : miniStats.map((metric) => (
              <MiniStat key={metric.id} tone={metric.tone} glyph={metric.glyph} label={metric.label} value={metric.value} />
            ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard title={t("admin.platformStatistics")} subtitle={t("admin.dailyActivitySubtitle")}>
          {analytics.isLoading ? (
            <div className="shimmer h-56 rounded-lg" />
          ) : (data?.dailyActivity.length ?? 0) === 0 ? (
            <EmptyState compact glyph="📈" title={t("admin.noDataTitle")} body={t("admin.noDataBody")} />
          ) : (
            <AreaChart points={data?.dailyActivity ?? []} tone="brand" ariaLabel={t("admin.platformStatistics")} />
          )}
        </ChartCard>

        <ChartCard title={t("admin.userGrowth")} subtitle={t("admin.userGrowthSubtitle")}>
          {analytics.isLoading ? (
            <div className="shimmer h-56 rounded-lg" />
          ) : (data?.userGrowth.length ?? 0) === 0 ? (
            <EmptyState compact glyph="📊" title={t("admin.noDataTitle")} body={t("admin.noDataBody")} />
          ) : (
            <BarChart points={data?.userGrowth ?? []} tone="grape" ariaLabel={t("admin.userGrowth")} />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
        <ChartCard title={t("admin.subjectShare")} subtitle={t("admin.topSubjectsSubtitle")}>
          {analytics.isLoading ? (
            <div className="shimmer h-48 rounded-lg" />
          ) : (data?.subjectShare.length ?? 0) === 0 ? (
            <EmptyState compact glyph="🥧" title={t("admin.noDataTitle")} body={t("admin.noDataBody")} />
          ) : (
            <DonutChart
              slices={(data?.subjectShare ?? []).map((slice) => ({
                label: slice.label,
                value: slice.value,
                tone: toneOf(slice.tone),
              }))}
              size={170}
              ariaLabel={t("admin.subjectShare")}
            />
          )}
        </ChartCard>

        <Card>
          <CardHeader title={t("admin.mostPopularLessons")} />
          <CardBody>
            {analytics.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="shimmer h-8 rounded-sm" />
                ))}
              </div>
            ) : (data?.topLessons.length ?? 0) === 0 ? (
              <EmptyState compact glyph="📚" title={t("admin.noDataTitle")} body={t("admin.noDataBody")} />
            ) : (
              <ol className="space-y-3">
                {(data?.topLessons ?? []).map((lesson, index) => (
                  <li key={lesson.id} className="flex items-center gap-3">
                    <span className="t-caption grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-muted font-bold text-content-secondary">
                      {index + 1}
                    </span>
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-sm text-base", toneStyles[toneOf(lesson.tone)].soft)} aria-hidden>
                      {lesson.glyph}
                    </span>
                    <span className="t-body-sm min-w-0 flex-1 truncate font-semibold text-content">{lesson.title}</span>
                    <span className="t-caption shrink-0 font-bold text-content-secondary tabular-nums">
                      {formatCompact(lesson.completions, intlLocale)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("admin.mostPlayedGames")} />
          <CardBody>
            {analytics.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="shimmer h-8 rounded-sm" />
                ))}
              </div>
            ) : (data?.topGames.length ?? 0) === 0 ? (
              <EmptyState compact glyph="🎮" title={t("admin.noDataTitle")} body={t("admin.noDataBody")} />
            ) : (
              <ol className="space-y-3">
                {(data?.topGames ?? []).map((game, index) => (
                  <li key={game.id} className="flex items-center gap-3">
                    <span className="t-caption grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-muted font-bold text-content-secondary">
                      {index + 1}
                    </span>
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-sm text-base", toneStyles[toneOf(game.tone)].soft)} aria-hidden>
                      {game.glyph}
                    </span>
                    <span className="t-body-sm min-w-0 flex-1 truncate font-semibold text-content">{game.title}</span>
                    <span className="t-caption shrink-0 font-bold text-content-secondary tabular-nums">
                      {formatCompact(game.plays, intlLocale)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* --- Platform settings ---------------------------------------------------- */

const FLAG_META: Array<{
  key: FeatureFlagKey;
  labelKey:
    | "admin.flagAiRecommendations"
    | "admin.flagAiImageGeneration"
    | "admin.flagVoiceControl"
    | "admin.flagPwa"
    | "admin.flagLeaderboard"
    | "admin.flagPushNotifications"
    | "admin.flagCertificates"
    | "admin.flagOfflineLessons";
  hintKey:
    | "admin.flagAiRecommendationsHint"
    | "admin.flagAiImageGenerationHint"
    | "admin.flagVoiceControlHint"
    | "admin.flagPwaHint"
    | "admin.flagLeaderboardHint"
    | "admin.flagPushNotificationsHint"
    | "admin.flagCertificatesHint"
    | "admin.flagOfflineLessonsHint";
}> = [
  { key: "AI_RECOMMENDATIONS", labelKey: "admin.flagAiRecommendations", hintKey: "admin.flagAiRecommendationsHint" },
  { key: "AI_IMAGE_GENERATION", labelKey: "admin.flagAiImageGeneration", hintKey: "admin.flagAiImageGenerationHint" },
  { key: "VOICE_CONTROL", labelKey: "admin.flagVoiceControl", hintKey: "admin.flagVoiceControlHint" },
  { key: "PWA", labelKey: "admin.flagPwa", hintKey: "admin.flagPwaHint" },
  { key: "LEADERBOARD", labelKey: "admin.flagLeaderboard", hintKey: "admin.flagLeaderboardHint" },
  { key: "PUSH_NOTIFICATIONS", labelKey: "admin.flagPushNotifications", hintKey: "admin.flagPushNotificationsHint" },
  { key: "CERTIFICATES", labelKey: "admin.flagCertificates", hintKey: "admin.flagCertificatesHint" },
  { key: "OFFLINE_LESSONS", labelKey: "admin.flagOfflineLessons", hintKey: "admin.flagOfflineLessonsHint" },
];

const AUDIT_PAGE_SIZE = 15;

export function AdminSettingsView() {
  const t = useT();
  const { intlLocale } = useI18n();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const [auditPage, setAuditPage] = useState(1);

  const flags = useQuery({ queryKey: queryKeys.featureFlags, queryFn: fetchFeatureFlags });
  const audit = useQuery({
    queryKey: queryKeys.auditLog({ page: auditPage, limit: AUDIT_PAGE_SIZE }),
    queryFn: () => fetchAuditLog({ page: auditPage, limit: AUDIT_PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const toggle = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => updateFeatureFlag(key, enabled),
    onMutate: async ({ key, enabled }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.featureFlags });
      const previous = queryClient.getQueryData<FeatureFlagsDto>(queryKeys.featureFlags);
      if (previous) {
        queryClient.setQueryData<FeatureFlagsDto>(queryKeys.featureFlags, { ...previous, [key]: enabled });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.featureFlags, context.previous);
      pushToast({
        title: t("state.errorTitle"),
        description: error instanceof ApiError ? error.message : undefined,
        tone: "coral",
        glyph: "⚠️",
      });
    },
    onSuccess: (nextFlags) => {
      queryClient.setQueryData(queryKeys.featureFlags, nextFlags);
      pushToast({ title: t("admin.flagSaved"), tone: "mint", glyph: "🚩" });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags });
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit-log"] });
    },
  });

  const auditRows = audit.data?.items ?? [];

  const auditColumns: Array<Column<AuditLogDto>> = [
    {
      id: "actor",
      header: t("admin.colActor"),
      primary: true,
      sortValue: (row) => row.userName ?? "",
      cell: (row) => <span className="font-semibold text-content">{row.userName ?? t("admin.systemActor")}</span>,
    },
    {
      id: "action",
      header: t("admin.colAction"),
      cell: (row) => (
        <span className="rounded-xs bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-content-secondary">{row.action}</span>
      ),
    },
    {
      id: "resource",
      header: t("admin.colResource"),
      secondary: true,
      cell: (row) => (
        <span className="text-content-secondary">
          {row.resource}
          {row.resourceId ? <span className="t-caption block truncate text-content-tertiary">{row.resourceId}</span> : null}
        </span>
      ),
    },
    {
      id: "when",
      header: t("admin.colWhen"),
      width: "w-40",
      sortValue: (row) => row.createdAt,
      cell: (row) => (
        <span className="t-caption text-content-secondary">{formatRelativeTime(row.createdAt, new Date(), intlLocale)}</span>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <PageHeading title={t("nav.settings")} subtitle={t("admin.settingsSubtitle")} />

      <Card>
        <CardHeader title={t("admin.featureFlags")} subtitle={t("admin.featureFlagsSubtitle")} />
        <CardBody className="space-y-4">
          {flags.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="shimmer h-10 rounded-sm" />
              ))}
            </div>
          ) : flags.isError ? (
            <InlineError message={t("state.errorBody")} onRetry={() => void flags.refetch()} retryLabel={t("common.retry")} />
          ) : (
            FLAG_META.map((flag) => (
              <Switch
                key={flag.key}
                label={t(flag.labelKey)}
                description={t(flag.hintKey)}
                checked={flags.data?.[flag.key] ?? false}
                disabled={toggle.isPending && toggle.variables?.key === flag.key}
                onChange={(enabled) => toggle.mutate({ key: flag.key, enabled })}
              />
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("admin.auditLog")} subtitle={t("admin.auditSubtitle")} />
        <CardBody>
          {audit.isLoading ? (
            <SkeletonTable rows={6} columns={4} />
          ) : audit.isError ? (
            <InlineError message={t("state.errorBody")} onRetry={() => void audit.refetch()} retryLabel={t("common.retry")} />
          ) : (
            <>
              <DataTable
                rows={auditRows}
                columns={auditColumns}
                getRowId={(row) => row.id}
                pageSize={AUDIT_PAGE_SIZE}
                caption={t("admin.auditLog")}
                emptyState={<EmptyState glyph="🗒️" title={t("state.emptyTitle")} body={t("state.emptyBody")} />}
              />
              {(audit.data?.meta.totalPages ?? 1) > 1 ? (
                <Pagination
                  className="mt-4"
                  page={auditPage}
                  totalPages={audit.data?.meta.totalPages ?? 1}
                  totalItems={audit.data?.meta.total}
                  onChange={setAuditPage}
                />
              ) : null}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
