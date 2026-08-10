"use client";

import { useState } from "react";
import { Plus, Send } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { Achievement, Certificate, Reward } from "@/types";
import { achievements, certificates, rewards } from "@/data/rewards";
import { buildLeaderboard } from "@/data/analytics";
import { getChild } from "@/data/children";
import { useAppStore } from "@/store/app-store";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import { LeaderboardList } from "@/features/rewards/leaderboard-list";
import { EmptyState } from "@/components/ui/states";

export function AchievementsAdminView() {
  const t = useT();
  const [selected, setSelected] = useState<string[]>([]);

  const columns: Array<Column<Achievement>> = [
    {
      id: "title",
      header: "Achievement",
      primary: true,
      sortValue: (row) => row.title,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl", toneStyles[row.tone].soft)} aria-hidden>
            {row.glyph}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.title}</p>
            <p className="t-caption truncate text-content-secondary">{row.description}</p>
          </div>
        </div>
      ),
    },
    { id: "tier", header: "Tier", width: "w-28", sortValue: (row) => row.tier, cell: (row) => <Badge tone={row.tone} size="sm">{row.tier}</Badge> },
    { id: "category", header: "Category", secondary: true, sortValue: (row) => row.category, cell: (row) => row.category },
    { id: "xp", header: "XP", align: "right", width: "w-24", sortValue: (row) => row.xpReward, cell: (row) => <span className="tabular-nums">+{row.xpReward}</span> },
    {
      id: "unlockRate",
      header: "Unlock rate",
      align: "right",
      sortValue: (row) => row.progress,
      cell: (row) => (
        <span className="inline-flex items-center gap-2">
          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-muted lg:block">
            <span className={cn("block h-full rounded-full", toneStyles[row.tone].solid)} style={{ width: `${row.progress}%` }} />
          </span>
          <span className="font-semibold tabular-nums text-content">{row.progress}%</span>
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PageHeading
        title={t("nav.achievements")}
        subtitle="Define what children can unlock and how much it's worth."
        actions={<Button leadingIcon={<Plus className="h-4 w-4" />}>New achievement</Button>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="sun" glyph="🏆" label="Total" value={achievements.length} />
        <StatCard tone="tangerine" glyph="🥉" label="Bronze" value={achievements.filter((a) => a.tier === "bronze").length} />
        <StatCard tone="sky" glyph="🥈" label="Silver" value={achievements.filter((a) => a.tier === "silver").length} />
        <StatCard tone="lagoon" glyph="💎" label="Diamond" value={achievements.filter((a) => a.tier === "diamond").length} />
      </div>

      <DataTable
        rows={achievements}
        columns={columns}
        getRowId={(row) => row.id}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        caption="Achievements"
        emptyState={<EmptyState glyph="🏆" title={t("state.emptyTitle")} body={t("state.emptyBody")} />}
      />
    </div>
  );
}

export function RewardsAdminView() {
  const t = useT();

  const columns: Array<Column<Reward>> = [
    {
      id: "title",
      header: "Reward",
      primary: true,
      sortValue: (row) => row.title,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm text-xl", toneStyles[row.tone].soft)} aria-hidden>
            {row.glyph}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.title}</p>
            <p className="t-caption truncate text-content-secondary">{row.description}</p>
          </div>
        </div>
      ),
    },
    { id: "cost", header: "Cost", align: "right", sortValue: (row) => row.costStars, cell: (row) => <span className="tabular-nums">⭐ {row.costStars}</span> },
    {
      id: "state",
      header: t("common.status"),
      width: "w-32",
      cell: (row) => (
        <Badge tone={row.unlocked ? "mint" : "sky"} size="sm">
          {row.unlocked ? "Live" : "Locked"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <PageHeading
        title={t("nav.rewards")}
        subtitle="Items children can buy with the stars they earn."
        actions={<Button leadingIcon={<Plus className="h-4 w-4" />}>New reward</Button>}
      />
      <DataTable rows={rewards} columns={columns} getRowId={(row) => row.id} caption="Rewards" />
    </div>
  );
}

export function NotificationsAdminView() {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const [audience, setAudience] = useState("all");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeading title={t("nav.notifications")} subtitle="Compose an announcement and choose who receives it." />

      <Card>
        <CardHeader title="New announcement" subtitle="Sent as an in-app notification and, optionally, a push message." />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required>
              {({ id }) => <Input id={id} placeholder="New lessons for ages 3–4" />}
            </Field>
            <Field label="Audience">
              {({ id }) => (
                <Select id={id} value={audience} onChange={(e) => setAudience(e.target.value)}>
                  <option value="all">All parents</option>
                  <option value="active">Active this week</option>
                  <option value="lapsed">Inactive 14+ days</option>
                  <option value="age">Parents of a specific age band</option>
                </Select>
              )}
            </Field>
          </div>

          <Field label="Message" hint="Keep it under two sentences — it appears in a list." required>
            {({ id }) => <Textarea id={id} rows={3} placeholder="Six new colour lessons are ready to try." />}
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              leadingIcon={<Send className="h-4 w-4" />}
              onClick={() => pushToast({ title: "Announcement queued", description: "Delivery starts in a few minutes.", tone: "brand", glyph: "📣" })}
            >
              Send announcement
            </Button>
            <Button variant="secondary">Save draft</Button>
            <p className="t-caption text-content-secondary">
              Estimated reach: <strong className="text-content">{audience === "all" ? "984" : audience === "active" ? "612" : "238"}</strong> parents
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent announcements" />
        <CardBody>
          <ul className="divide-y divide-border">
            {[
              ["New lesson added", "Animals in the Jungle", "984 delivered", "🎉"],
              ["Weekly report ready", "3–9 August summary", "912 delivered", "📊"],
              ["Puzzle game updated", "Three new scenes", "876 delivered", "🧩"],
            ].map(([title, body, reach, glyph]) => (
              <li key={title} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-surface-muted text-lg" aria-hidden>
                  {glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="t-body-sm font-semibold text-content">{title}</p>
                  <p className="t-caption text-content-secondary">{body}</p>
                </div>
                <Badge tone="mint" size="sm">
                  {reach}
                </Badge>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

export function LeaderboardAdminView() {
  const t = useT();
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all">("weekly");
  const entries = buildLeaderboard("", period === "weekly" ? 1 : period === "monthly" ? 3.4 : 9.2);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <PageHeading
        title={t("nav.leaderboard")}
        subtitle="Moderate the public ranking. Only display names and scores are ever exposed."
      />

      <Tabs
        variant="segmented"
        ariaLabel="Leaderboard period"
        value={period}
        onChange={setPeriod}
        items={[
          { id: "weekly", label: t("common.weekly") },
          { id: "monthly", label: t("common.monthly") },
          { id: "all", label: t("common.allTime") },
        ]}
      />

      <Card>
        <CardHeader title="Current standings" subtitle={`${entries.length} learners`} />
        <CardBody>
          <LeaderboardList entries={entries} />
        </CardBody>
      </Card>
    </div>
  );
}

export function CertificatesAdminView() {
  const t = useT();
  const { intlLocale } = useI18n();

  const columns: Array<Column<Certificate>> = [
    {
      id: "title",
      header: "Certificate",
      primary: true,
      sortValue: (row) => row.title,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-sun-soft text-xl dark:bg-sun-core/15" aria-hidden>
            📜
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.title}</p>
            <p className="t-caption truncate text-content-secondary">{row.programme}</p>
          </div>
        </div>
      ),
    },
    { id: "child", header: "Awarded to", sortValue: (row) => getChild(row.childId).name, cell: (row) => getChild(row.childId).name },
    { id: "xp", header: "XP", align: "right", secondary: true, sortValue: (row) => row.xp, cell: (row) => <span className="tabular-nums">{row.xp}</span> },
    { id: "stars", header: "Stars", align: "right", secondary: true, sortValue: (row) => row.stars, cell: (row) => <span className="tabular-nums">⭐ {row.stars}</span> },
    { id: "serial", header: "Serial", secondary: true, cell: (row) => <span className="t-caption tabular-nums text-content-secondary">{row.serial}</span> },
    {
      id: "issued",
      header: "Issued",
      sortValue: (row) => row.issuedAt,
      cell: (row) => <span className="t-caption text-content-secondary">{formatDate(row.issuedAt, intlLocale)}</span>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <PageHeading
        title={t("nav.certificates")}
        subtitle="Every certificate the platform has issued, with its verification serial."
      />
      <DataTable rows={certificates} columns={columns} getRowId={(row) => row.id} caption="Certificates" />
    </div>
  );
}
