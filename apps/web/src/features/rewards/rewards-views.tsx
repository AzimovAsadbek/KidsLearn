"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import type { AchievementDto, LeaderboardPeriod, MedalTier } from "@kidslearn/types";
import { useChildContext } from "@/components/providers/child-provider";
import { useAppStore } from "@/store/app-store";
import { ApiError } from "@/lib/api/client";
import {
  claimReward,
  fetchAchievements,
  fetchLeaderboard,
  fetchRewards,
  queryKeys,
} from "@/lib/api/queries";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ui/progress";
import { EmptyState, SkeletonCard } from "@/components/ui/states";
import { AchievementCard, RewardCard } from "./achievement-card";
import { LeaderboardList, LeaderboardPodium } from "./leaderboard-list";

const MEDAL_TIERS: Array<{ tier: MedalTier; glyph: string; label: string; tone: Tone }> = [
  { tier: "BRONZE", glyph: "🥉", label: "Bronze", tone: "tangerine" },
  { tier: "SILVER", glyph: "🥈", label: "Silver", tone: "sky" },
  { tier: "GOLD", glyph: "🥇", label: "Gold", tone: "sun" },
  { tier: "DIAMOND", glyph: "💎", label: "Diamond", tone: "lagoon" },
];

/* --- Achievements -------------------------------------------------------- */

type Category = AchievementDto["category"] | "all";

export function AchievementsView() {
  const t = useT();
  const { selectedChild } = useChildContext();
  const [category, setCategory] = useState<Category>("all");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.achievements(selectedChild?.id ?? "none"),
    queryFn: () => fetchAchievements(selectedChild!.id),
    enabled: Boolean(selectedChild?.id),
  });

  const achievements = useMemo(() => data ?? [], [data]);
  const unlocked = achievements.filter((achievement) => achievement.unlockedAt);
  const filtered = useMemo(
    () => (category === "all" ? achievements : achievements.filter((a) => a.category === category)),
    [achievements, category],
  );

  if (!selectedChild) {
    return <EmptyState glyph="👶" title="No child selected" body="Add a child to start collecting medals." />;
  }

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-6">
      <PageHeading
        title={t("nav.achievements")}
        subtitle={`${selectedChild.name} has unlocked ${unlocked.length} of ${achievements.length} achievements.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="sun" glyph="🏆" label={t("rewards.earned")} value={unlocked.length} />
        <StatCard tone="sky" glyph="🔒" label={t("rewards.locked")} value={achievements.length - unlocked.length} />
        <StatCard tone="grape" glyph="⚡" label="XP from achievements" value={unlocked.reduce((sum, a) => sum + a.xpReward, 0)} />
        <StatCard
          tone="mint"
          glyph="📈"
          label="Collection"
          value={achievements.length > 0 ? `${Math.round((unlocked.length / achievements.length) * 100)}%` : "0%"}
        />
      </div>

      <Card>
        <CardHeader title="Medal tiers" subtitle="Each tier needs a deeper streak of consistent learning." />
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MEDAL_TIERS.map((tier) => {
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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} className="h-48" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
  const { selectedChild } = useChildContext();
  const queryClient = useQueryClient();
  const pushToast = useAppStore((s) => s.pushToast);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.rewards(selectedChild?.id ?? "none"),
    queryFn: () => fetchRewards(selectedChild!.id),
    enabled: Boolean(selectedChild?.id),
  });

  const claim = useMutation({
    mutationFn: (rewardId: string) => claimReward(selectedChild!.id, rewardId),
    onSuccess: async () => {
      // Claiming spends stars, so the child aggregate has to be refetched too.
      await queryClient.invalidateQueries({ queryKey: ["children"] });
      pushToast({ title: "Reward claimed", tone: "mint", glyph: "🎁" });
    },
    onError: (error) => {
      pushToast({
        title: error instanceof ApiError ? error.message : "That reward couldn't be claimed.",
        tone: "coral",
        glyph: "⚠️",
      });
    },
  });

  if (!selectedChild) {
    return <EmptyState glyph="👶" title="No child selected" body="Add a child to open the reward store." />;
  }

  const rewards = data ?? [];
  const stars = selectedChild.progress?.stars ?? 0;

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-6">
      <PageHeading title={t("nav.rewards")} subtitle={`${selectedChild.name} can spend stars on avatars, themes and stickers.`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="sun" glyph="⭐" label="Stars available" value={stars} />
        <StatCard tone="mint" glyph="🎁" label="Rewards claimed" value={rewards.filter((r) => r.claimed).length} />
        <StatCard tone="grape" glyph="🔒" label="Still locked" value={rewards.filter((r) => !r.claimed).length} />
      </div>

      <Card>
        <CardHeader title="Reward store" subtitle="Stars are earned in lessons and games — never bought." />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? [0, 1, 2].map((i) => <SkeletonCard key={i} className="h-52" />)
            : rewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  stars={stars}
                  claiming={claim.isPending}
                  onClaim={(rewardId) => claim.mutate(rewardId)}
                />
              ))}
        </CardBody>
      </Card>
    </div>
  );
}

/* --- Leaderboard --------------------------------------------------------- */

export function LeaderboardView() {
  const t = useT();
  const { selectedChild } = useChildContext();
  const [period, setPeriod] = useState<LeaderboardPeriod>("WEEKLY");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.leaderboard(period, selectedChild?.id),
    queryFn: () => fetchLeaderboard(period, selectedChild?.id),
  });

  const entries = data?.entries ?? [];
  const me = data?.currentChild ?? null;

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
          { id: "WEEKLY", label: t("common.weekly") },
          { id: "MONTHLY", label: t("common.monthly") },
          { id: "ALL_TIME", label: t("common.allTime") },
        ]}
      />

      {isLoading ? (
        <SkeletonCard className="h-64" />
      ) : entries.length === 0 ? (
        <EmptyState glyph="🏆" title="No standings yet" body="The board fills in as children start learning." />
      ) : (
        <>
          <Card>
            <CardBody className="pt-8">
              <LeaderboardPodium entries={entries} />
            </CardBody>
          </Card>

          {me ? (
            <Card className="border-primary bg-primary-soft">
              <CardBody className="flex flex-wrap items-center justify-between gap-4 pt-5">
                <div>
                  <p className="t-overline text-primary">{me.displayName}&apos;s position</p>
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
            <CardHeader title="Full ranking" subtitle={`${entries.length} learners`} />
            <CardBody>
              <LeaderboardList entries={entries} />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
