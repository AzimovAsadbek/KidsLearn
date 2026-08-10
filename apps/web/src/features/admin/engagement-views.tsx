"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { toneStyles, TONES, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { LeaderboardPeriod } from "@kidslearn/types";
import { ApiError } from "@/lib/api/client";
import {
  broadcastNotification,
  fetchAdminAchievements,
  fetchAdminCertificates,
  fetchAdminRewards,
  fetchAuditLog,
  fetchLeaderboard,
  queryKeys,
  type AdminAchievementRow,
  type AdminCertificateRow,
  type AdminRewardRow,
} from "@/lib/api/queries";
import { useAppStore } from "@/store/app-store";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import { LeaderboardList } from "@/features/rewards/leaderboard-list";
import { EmptyState, ErrorState, InlineError, SkeletonCard, SkeletonTable } from "@/components/ui/states";

const TIER_KEY = {
  BRONZE: "rewards.bronze",
  SILVER: "rewards.silver",
  GOLD: "rewards.gold",
  DIAMOND: "rewards.diamond",
} as const;

const CATEGORY_KEY = {
  learning: "admin.catLearning",
  streak: "admin.catStreak",
  games: "admin.catGames",
  mastery: "admin.catMastery",
  social: "admin.catSocial",
} as const;

function toneOf(tone: string): Tone {
  return (TONES as readonly string[]).includes(tone) ? (tone as Tone) : "brand";
}

export function AchievementsAdminView() {
  const t = useT();

  const achievements = useQuery({ queryKey: queryKeys.adminAchievements, queryFn: fetchAdminAchievements });
  const rows = achievements.data ?? [];

  const columns: Array<Column<AdminAchievementRow>> = [
    {
      id: "title",
      header: t("admin.colAchievement"),
      primary: true,
      sortValue: (row) => row.title,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl", toneStyles[toneOf(row.tone)].soft)} aria-hidden>
            {row.glyph}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.title}</p>
            <p className="t-caption truncate text-content-secondary">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      id: "tier",
      header: t("admin.colTier"),
      width: "w-28",
      sortValue: (row) => row.tier,
      cell: (row) => (
        <Badge tone={toneOf(row.tone)} size="sm">
          {t(TIER_KEY[row.tier as keyof typeof TIER_KEY] ?? "rewards.bronze")}
        </Badge>
      ),
    },
    {
      id: "category",
      header: t("admin.colCategory"),
      secondary: true,
      sortValue: (row) => row.category,
      cell: (row) => {
        const key = CATEGORY_KEY[row.category as keyof typeof CATEGORY_KEY];
        return key ? t(key) : row.category;
      },
    },
    {
      id: "xp",
      header: t("common.xp"),
      align: "right",
      width: "w-24",
      sortValue: (row) => row.xpReward,
      cell: (row) => <span className="tabular-nums">+{row.xpReward}</span>,
    },
    {
      id: "unlocked",
      header: t("admin.colUnlocked"),
      align: "right",
      secondary: true,
      sortValue: (row) => row.unlockedCount,
      cell: (row) => <span className="tabular-nums text-content-secondary">{row.unlockedCount}</span>,
    },
    {
      id: "unlockRate",
      header: t("admin.colUnlockRate"),
      align: "right",
      sortValue: (row) => row.unlockRate,
      cell: (row) => (
        <span className="inline-flex items-center gap-2">
          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-muted lg:block">
            <span className={cn("block h-full rounded-full", toneStyles[toneOf(row.tone)].solid)} style={{ width: `${row.unlockRate}%` }} />
          </span>
          <span className="font-semibold tabular-nums text-content">{row.unlockRate}%</span>
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PageHeading title={t("nav.achievements")} subtitle={t("admin.definitionsReadOnly")} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {achievements.isLoading ? (
          Array.from({ length: 4 }, (_, i) => <div key={i} className="shimmer h-32 rounded-xl" />)
        ) : (
          <>
            <StatCard tone="sun" glyph="🏆" label={t("admin.statTotal")} value={rows.length} />
            <StatCard tone="tangerine" glyph="🥉" label={t("rewards.bronze")} value={rows.filter((a) => a.tier === "BRONZE").length} />
            <StatCard tone="sky" glyph="🥈" label={t("rewards.silver")} value={rows.filter((a) => a.tier === "SILVER").length} />
            <StatCard tone="lagoon" glyph="💎" label={t("rewards.diamond")} value={rows.filter((a) => a.tier === "DIAMOND").length} />
          </>
        )}
      </div>

      {achievements.isLoading ? (
        <SkeletonTable rows={8} columns={5} />
      ) : achievements.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void achievements.refetch()}>{t("common.retry")}</Button>}
        />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          caption={t("nav.achievements")}
          emptyState={<EmptyState glyph="🏆" title={t("state.emptyTitle")} body={t("state.emptyBody")} />}
        />
      )}
    </div>
  );
}

export function RewardsAdminView() {
  const t = useT();

  const rewards = useQuery({ queryKey: queryKeys.adminRewards, queryFn: fetchAdminRewards });
  const rows = rewards.data ?? [];

  const columns: Array<Column<AdminRewardRow>> = [
    {
      id: "title",
      header: t("admin.colReward"),
      primary: true,
      sortValue: (row) => row.title,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm text-xl", toneStyles[toneOf(row.tone)].soft)} aria-hidden>
            {row.glyph}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.title}</p>
            <p className="t-caption truncate text-content-secondary">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      id: "cost",
      header: t("admin.colCost"),
      align: "right",
      sortValue: (row) => row.costStars,
      cell: (row) => <span className="tabular-nums">⭐ {row.costStars}</span>,
    },
    {
      id: "state",
      header: t("common.status"),
      width: "w-32",
      cell: (row) => (
        <Badge tone={row.active ? "mint" : "sky"} size="sm">
          {row.active ? t("admin.statusActive") : t("admin.statusInactive")}
        </Badge>
      ),
    },
    {
      id: "claims",
      header: t("admin.colClaims"),
      align: "right",
      sortValue: (row) => row.claimCount,
      cell: (row) => <span className="tabular-nums text-content-secondary">{row.claimCount}</span>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <PageHeading title={t("nav.rewards")} subtitle={t("admin.rewardsSubtitle")} />
      {rewards.isLoading ? (
        <SkeletonTable rows={6} columns={4} />
      ) : rewards.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void rewards.refetch()}>{t("common.retry")}</Button>}
        />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          caption={t("nav.rewards")}
          emptyState={<EmptyState glyph="🎁" title={t("state.emptyTitle")} body={t("state.emptyBody")} />}
        />
      )}
    </div>
  );
}

export function NotificationsAdminView() {
  const t = useT();
  const { intlLocale, plural } = useI18n();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /** Past broadcasts are read from the audit trail — the API records each send. */
  const broadcasts = useQuery({
    queryKey: queryKeys.auditLog({ page: 1, limit: 20, purpose: "broadcasts" }),
    queryFn: () => fetchAuditLog({ page: 1, limit: 20 }),
    select: (page) => page.items.filter((entry) => entry.action === "notification.broadcast").slice(0, 6),
  });

  const send = useMutation({
    mutationFn: () =>
      broadcastNotification({
        title: title.trim(),
        body: body.trim(),
        href: href.trim() || undefined,
      }),
    onSuccess: ({ reach }) => {
      pushToast({
        title: t("admin.broadcastSent"),
        description: plural("plural.parentsNotified", reach),
        tone: "brand",
        glyph: "📣",
      });
      setTitle("");
      setBody("");
      setHref("");
      setFieldErrors({});
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit-log"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.details) {
        setFieldErrors(
          Object.fromEntries(Object.entries(error.details).map(([field, messages]) => [field, messages[0] ?? ""])),
        );
      }
      pushToast({
        title: t("state.errorTitle"),
        description: error instanceof ApiError ? error.message : undefined,
        tone: "coral",
        glyph: "⚠️",
      });
    },
  });

  const canSend = title.trim().length >= 3 && body.trim().length >= 3;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeading title={t("nav.notifications")} subtitle={t("admin.broadcastSubtitle")} />

      <Card>
        <CardHeader title={t("admin.newAnnouncement")} subtitle={t("admin.broadcastHint")} />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("admin.fieldTitle")} required error={fieldErrors.title}>
              {({ id, invalid }) => (
                <Input id={id} invalid={invalid} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
              )}
            </Field>
            <Field label={t("admin.fieldLink")} error={fieldErrors.href}>
              {({ id, invalid }) => (
                <Input id={id} invalid={invalid} value={href} onChange={(e) => setHref(e.target.value)} maxLength={200} />
              )}
            </Field>
          </div>

          <Field label={t("admin.fieldMessage")} hint={t("admin.fieldMessageHint")} required error={fieldErrors.body}>
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
              />
            )}
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              leadingIcon={<Send className="h-4 w-4" />}
              loading={send.isPending}
              disabled={!canSend}
              onClick={() => send.mutate()}
            >
              {t("admin.sendAnnouncement")}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("admin.recentAnnouncements")} />
        <CardBody>
          {broadcasts.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="shimmer h-10 rounded-sm" />
              ))}
            </div>
          ) : broadcasts.isError ? (
            <InlineError message={t("state.errorBody")} onRetry={() => void broadcasts.refetch()} retryLabel={t("common.retry")} />
          ) : (broadcasts.data?.length ?? 0) === 0 ? (
            <EmptyState compact glyph="📣" title={t("state.emptyTitle")} body={t("state.emptyBody")} />
          ) : (
            <ul className="divide-y divide-border">
              {(broadcasts.data ?? []).map((entry) => {
                const entryTitle = typeof entry.metadata?.title === "string" ? entry.metadata.title : entry.action;
                const reach = typeof entry.metadata?.reach === "number" ? entry.metadata.reach : null;
                return (
                  <li key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-surface-muted text-lg" aria-hidden>
                      📣
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="t-body-sm font-semibold text-content">{entryTitle}</p>
                      <p className="t-caption text-content-secondary">
                        {formatRelativeTime(entry.createdAt, new Date(), intlLocale)}
                      </p>
                    </div>
                    {reach !== null ? (
                      <Badge tone="mint" size="sm">
                        {plural("plural.parentsNotified", reach)}
                      </Badge>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export function LeaderboardAdminView() {
  const t = useT();
  const { plural } = useI18n();
  const [period, setPeriod] = useState<LeaderboardPeriod>("WEEKLY");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.leaderboard(period),
    queryFn: () => fetchLeaderboard(period),
  });
  const entries = data?.entries ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <PageHeading title={t("nav.leaderboard")} subtitle={t("admin.leaderboardSubtitle")} />

      <Tabs
        variant="segmented"
        ariaLabel={t("admin.leaderboardPeriod")}
        value={period}
        onChange={setPeriod}
        items={[
          { id: "WEEKLY", label: t("common.weekly") },
          { id: "MONTHLY", label: t("common.monthly") },
          { id: "ALL_TIME", label: t("common.allTime") },
        ]}
      />

      <Card>
        <CardHeader title={t("admin.currentStandings")} subtitle={plural("plural.learners", entries.length)} />
        <CardBody>
          {isLoading ? (
            <SkeletonCard />
          ) : isError ? (
            <InlineError message={t("state.errorBody")} onRetry={() => void refetch()} retryLabel={t("common.retry")} />
          ) : (
            <LeaderboardList entries={entries} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

const CERT_STATUS: Record<string, { key: "admin.certPending" | "admin.certReady" | "admin.certFailed"; tone: Tone }> = {
  PENDING: { key: "admin.certPending", tone: "sun" },
  READY: { key: "admin.certReady", tone: "mint" },
  FAILED: { key: "admin.certFailed", tone: "coral" },
};

const CERT_PAGE_SIZE = 10;

export function CertificatesAdminView() {
  const t = useT();
  const { intlLocale } = useI18n();
  const [page, setPage] = useState(1);

  const certificates = useQuery({
    queryKey: queryKeys.adminCertificates({ page }),
    queryFn: () => fetchAdminCertificates({ page, limit: CERT_PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const rows = certificates.data?.items ?? [];

  const columns: Array<Column<AdminCertificateRow>> = [
    {
      id: "title",
      header: t("admin.colCertificate"),
      primary: true,
      sortValue: (row) => row.programme,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-sun-soft text-xl dark:bg-sun-core/15" aria-hidden>
            📜
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.programme}</p>
            <p className="t-caption truncate text-content-secondary">{row.childName}</p>
          </div>
        </div>
      ),
    },
    { id: "child", header: t("cert.awardedTo"), sortValue: (row) => row.childName, cell: (row) => row.childName },
    {
      id: "xp",
      header: t("common.xp"),
      align: "right",
      secondary: true,
      sortValue: (row) => row.xp,
      cell: (row) => <span className="tabular-nums">{row.xp}</span>,
    },
    {
      id: "stars",
      header: t("common.stars"),
      align: "right",
      secondary: true,
      sortValue: (row) => row.stars,
      cell: (row) => <span className="tabular-nums">⭐ {row.stars}</span>,
    },
    {
      id: "serial",
      header: t("cert.serial"),
      secondary: true,
      cell: (row) => <span className="t-caption tabular-nums text-content-secondary">{row.serial}</span>,
    },
    {
      id: "status",
      header: t("common.status"),
      width: "w-32",
      cell: (row) => {
        const meta = CERT_STATUS[row.status] ?? CERT_STATUS.PENDING;
        return (
          <Badge tone={meta.tone} size="sm">
            <span className={cn("h-1.5 w-1.5 rounded-full", toneStyles[meta.tone].solid)} aria-hidden />
            {t(meta.key)}
          </Badge>
        );
      },
    },
    {
      id: "issued",
      header: t("admin.colIssued"),
      sortValue: (row) => row.issuedAt,
      cell: (row) => <span className="t-caption text-content-secondary">{formatDate(row.issuedAt, intlLocale)}</span>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <PageHeading title={t("nav.certificates")} subtitle={t("admin.certificatesSubtitle")} />
      {certificates.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : certificates.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void certificates.refetch()}>{t("common.retry")}</Button>}
        />
      ) : (
        <>
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            pageSize={CERT_PAGE_SIZE}
            caption={t("nav.certificates")}
            emptyState={<EmptyState glyph="📜" title={t("state.emptyTitle")} body={t("state.emptyBody")} />}
          />
          {(certificates.data?.meta.totalPages ?? 1) > 1 ? (
            <Pagination
              className="mt-4"
              page={page}
              totalPages={certificates.data?.meta.totalPages ?? 1}
              totalItems={certificates.data?.meta.total}
              onChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
