"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import type { Achievement } from "@/types";
import { useAppStore, useGains } from "@/store/app-store";
import { getChild } from "@/data/children";
import { achievements, medalTiers, rewards } from "@/data/rewards";
import { buildLeaderboard } from "@/data/analytics";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/states";
import { AchievementCard, RewardCard } from "./achievement-card";
import { LeaderboardList, LeaderboardPodium } from "./leaderboard-list";

/* --- Achievements -------------------------------------------------------- */

type Category = Achievement["category"] | "all";

export function AchievementsView() {
  const t = useT();
  const childId = useAppStore((s) => s.selectedChildId);
  const child = getChild(childId);
  const [category, setCategory] = useState<Category>("all");

  const unlocked = achievements.filter((a) => a.progress >= 100);
  const filtered = useMemo(
    () => (category === "all" ? achievements : achievements.filter((a) => a.category === category)),
    [category],
  );

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-6">
      <PageHeading
        title={t("nav.achievements")}
        subtitle={`${child.name} has unlocked ${unlocked.length} of ${achievements.length} achievements.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="sun" glyph="🏆" label={t("rewards.earned")} value={unlocked.length} />
        <StatCard tone="sky" glyph="🔒" label={t("rewards.locked")} value={achievements.length - unlocked.length} />
        <StatCard
          tone="grape"
          glyph="⚡"
          label="XP from achievements"
          value={unlocked.reduce((sum, a) => sum + a.xpReward, 0)}
        />
        <StatCard
          tone="mint"
          glyph="📈"
          label="Collection"
          value={`${Math.round((unlocked.length / achievements.length) * 100)}%`}
        />
      </div>

      <Card>
        <CardHeader title="Medal tiers" subtitle="Each tier needs a deeper streak of consistent learning." />
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {medalTiers.map((tier) => {
            const owned = unlocked.filter((a) => a.tier === tier.tier).length;
            const total = achievements.filter((a) => a.tier === tier.tier).length;
            return (
              <div key={tier.tier} className={cn("rounded-lg border border-border p-4", toneStyles[tier.tone].soft)}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden>
                    {tier.glyph}
                  </span>
                  <div className="min-w-0">
                    <p className="t-h4 text-content">{tier.label}</p>
                    <p className="t-caption text-content-secondary tabular-nums">
                      {owned} / {total} earned
                    </p>
                  </div>
                </div>
                <ProgressBar className="mt-3" value={total ? (owned / total) * 100 : 0} tone={tier.tone} size="sm" />
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Tabs
        variant="pill"
        ariaLabel="Achievement categories"
        value={category}
        onChange={setCategory}
        items={[
          { id: "all", label: "All", count: achievements.length },
          { id: "learning", label: "Learning" },
          { id: "streak", label: "Streaks" },
          { id: "games", label: "Games" },
          { id: "mastery", label: "Mastery" },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState glyph="🏅" title={t("state.emptyTitle")} body={t("state.emptyBody")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Rewards ------------------------------------------------------------- */

export function RewardsView() {
  const t = useT();
  const childId = useAppStore((s) => s.selectedChildId);
  const child = getChild(childId);
  const gains = useGains(childId);
  const stars = child.stars + gains.stars;

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-6">
      <PageHeading title={t("nav.rewards")} subtitle={`${child.name} can spend stars on avatars, themes and stickers.`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="sun" glyph="⭐" label="Stars available" value={stars} />
        <StatCard tone="mint" glyph="🎁" label="Rewards claimed" value={rewards.filter((r) => r.unlocked).length} />
        <StatCard tone="grape" glyph="🔒" label="Still locked" value={rewards.filter((r) => !r.unlocked).length} />
      </div>

      <Card>
        <CardHeader title="Reward store" subtitle="Stars are earned in lessons and games — never bought." />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((reward) => (
            <RewardCard key={reward.id} reward={reward} stars={stars} />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

/* --- Leaderboard --------------------------------------------------------- */

export function LeaderboardView() {
  const t = useT();
  const childId = useAppStore((s) => s.selectedChildId);
  const child = getChild(childId);
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all">("weekly");

  const entries = useMemo(
    () => buildLeaderboard(childId, period === "weekly" ? 1 : period === "monthly" ? 3.4 : 9.2),
    [childId, period],
  );
  const me = entries.find((entry) => entry.isCurrentChild);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeading
        title={t("nav.leaderboard")}
        subtitle="Display names and stars only — no ages, no photos, no locations."
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
        <CardBody className="pt-8">
          <LeaderboardPodium entries={entries} />
        </CardBody>
      </Card>

      {me ? (
        <Card className="border-primary bg-primary-soft">
          <CardBody className="flex flex-wrap items-center justify-between gap-4 pt-5">
            <div>
              <p className="t-overline text-primary">{child.name}&apos;s position</p>
              <p className="t-h2 mt-0.5 text-content">
                #{me.rank} <span className="t-body-sm font-semibold text-content-secondary">of {entries.length}</span>
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="t-caption text-content-secondary">{t("common.stars")}</p>
                <p className="t-h3 text-content tabular-nums">⭐ {me.stars}</p>
              </div>
              <div className="text-right">
                <p className="t-caption text-content-secondary">{t("common.xp")}</p>
                <p className="t-h3 text-content tabular-nums">{me.xp}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Full ranking" subtitle={`${entries.length} learners in this age band`} />
        <CardBody>
          <LeaderboardList entries={entries} />
        </CardBody>
      </Card>
    </div>
  );
}
