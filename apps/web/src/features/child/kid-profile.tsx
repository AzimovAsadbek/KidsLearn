"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn, formatDuration } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import type { MedalTier } from "@kidslearn/types";
import { useChildContext } from "@/components/providers/child-provider";
import { useAppStore } from "@/store/app-store";
import {
  claimReward,
  fetchAchievements,
  fetchLeaderboard,
  fetchRewards,
  fetchStatistics,
  queryKeys,
} from "@/lib/api/queries";
import { Avatar } from "@/components/ui/avatar";
import { ProgressRing, XpBar } from "@/components/ui/progress";
import { HeatGrid } from "@/components/charts/heat-grid";
import { AchievementCard, RewardCard } from "@/features/rewards/achievement-card";
import { LeaderboardList } from "@/features/rewards/leaderboard-list";
import { Mascot } from "@/components/kid/mascot";
import { KidLoading } from "@/components/kid/kid-loading";
import { KidPageHeader } from "./kid-library";

const MEDAL_TIERS: Array<{ tier: MedalTier; glyph: string; label: string; tone: Tone }> = [
  { tier: "BRONZE", glyph: "🥉", label: "Bronze", tone: "tangerine" },
  { tier: "SILVER", glyph: "🥈", label: "Silver", tone: "sky" },
  { tier: "GOLD", glyph: "🥇", label: "Gold", tone: "sun" },
  { tier: "DIAMOND", glyph: "💎", label: "Diamond", tone: "lagoon" },
];

/** Big, celebratory stat tile for the child's own screens. */
function KidStat({ glyph, value, label, tone }: { glyph: string; value: string | number; label: string; tone: Tone }) {
  return (
    <div className={cn("rounded-2xl border-2 border-border p-4 text-center", toneStyles[tone].soft)}>
      <span className="text-3xl" aria-hidden>
        {glyph}
      </span>
      <p className="font-display mt-1 text-2xl font-extrabold text-content tabular-nums">{value}</p>
      <p className="t-caption font-bold text-content-secondary">{label}</p>
    </div>
  );
}

export function KidProfileView() {
  const t = useT();
  const { selectedChild, loading } = useChildContext();
  const childId = selectedChild?.id;

  const achievements = useQuery({
    queryKey: queryKeys.achievements(childId ?? "none"),
    queryFn: () => fetchAchievements(childId as string),
    enabled: Boolean(childId),
  });
  const statistics = useQuery({
    queryKey: queryKeys.statistics(childId ?? "none", "month"),
    queryFn: () => fetchStatistics(childId as string, "month"),
    enabled: Boolean(childId),
  });
  const leaderboard = useQuery({
    queryKey: queryKeys.leaderboard("WEEKLY", childId),
    queryFn: () => fetchLeaderboard("WEEKLY", childId),
    enabled: Boolean(childId),
  });

  if (loading || !selectedChild) return <KidLoading message="Finding your profile…" />;

  const progress = selectedChild.progress;
  const tone = selectedChild.avatarTone as Tone;
  const unlocked = (achievements.data ?? []).filter((achievement) => achievement.unlockedAt);
  const nextUp = (achievements.data ?? [])
    .filter((achievement) => !achievement.unlockedAt)
    .sort((a, b) => b.progress - a.progress)[0];

  return (
    <div className="space-y-6">
      {/* ---- Playful hero -------------------------------------------------- */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl border-2 border-border p-6 text-center shadow-soft",
          toneStyles[tone]?.soft ?? toneStyles.brand.soft,
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.85), transparent 55%)" }}
        />
        <div className="relative">
          <Avatar
            spec={{ glyph: selectedChild.avatarGlyph, tone }}
            size="2xl"
            className="mx-auto ring-4 ring-surface shadow-card"
            label={`${selectedChild.name}'s avatar`}
          />
          <h1 className="font-display mt-4 text-3xl font-extrabold text-content">{selectedChild.name}</h1>
          <p className="t-body-sm mt-0.5 font-bold text-content-secondary">
            {selectedChild.age} years old · Level {progress?.level ?? 1}
          </p>

          {progress ? (
            <div className="mx-auto mt-5 max-w-md">
              <XpBar xp={progress.xpIntoLevel} xpToNext={progress.xpForNextLevel} level={progress.level} />
            </div>
          ) : null}
        </div>
      </section>

      {/* ---- Stats --------------------------------------------------------- */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KidStat glyph="⭐" value={progress?.stars ?? 0} label={t("common.stars")} tone="sun" />
        <KidStat glyph="🔥" value={progress?.currentStreak ?? 0} label={t("common.streak")} tone="coral" />
        <KidStat glyph="📗" value={progress?.lessonsCompleted ?? 0} label={t("nav.lessons")} tone="mint" />
        <KidStat
          glyph="⏱️"
          value={formatDuration(Math.round((progress?.learningSeconds ?? 0) / 60))}
          label="Time"
          tone="sky"
        />
      </section>

      {/* ---- Next medal ---------------------------------------------------- */}
      {nextUp ? (
        <section className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-border bg-surface p-5 shadow-soft">
          <ProgressRing
            value={nextUp.progress}
            size={92}
            thickness={9}
            tone={nextUp.tone as Tone}
            label={`${nextUp.progress}% towards ${nextUp.title}`}
          >
            <span className="text-3xl" aria-hidden>
              {nextUp.glyph}
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="t-overline text-content-tertiary">Almost there</p>
            <h2 className="font-display text-xl font-extrabold text-content">{nextUp.title}</h2>
            <p className="t-body-sm font-semibold text-content-secondary">{nextUp.description}</p>
          </div>
          <Mascot size={78} mood="cheer" float={false} className="shrink-0" />
        </section>
      ) : null}

      {/* ---- Medals -------------------------------------------------------- */}
      <section aria-labelledby="kid-medals">
        <h2 id="kid-medals" className="font-display mb-3 text-xl font-extrabold text-content">
          {t("rewards.medals")}
        </h2>
        {unlocked.length === 0 ? (
          <p className="t-body-sm rounded-2xl border-2 border-dashed border-border-strong bg-surface/60 p-6 text-center font-semibold text-content-secondary">
            Finish a lesson to earn your first medal!
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {unlocked.slice(0, 8).map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} compact />
            ))}
          </div>
        )}
      </section>

      {/* ---- Streak calendar ------------------------------------------------ */}
      <section className="rounded-3xl border-2 border-border bg-surface p-5 shadow-soft">
        <h2 className="font-display mb-3 text-xl font-extrabold text-content">My learning days</h2>
        <HeatGrid values={(statistics.data?.consistency ?? []).map((day) => day.level)} ariaLabel="Days learned" />
      </section>

      {/* ---- Leaderboard ---------------------------------------------------- */}
      <section className="rounded-3xl border-2 border-border bg-surface p-5 shadow-soft">
        <h2 className="font-display mb-3 text-xl font-extrabold text-content">{t("nav.leaderboard")}</h2>
        <LeaderboardList entries={(leaderboard.data?.entries ?? []).slice(0, 6)} />
      </section>
    </div>
  );
}

export function KidRewardsView() {
  const t = useT();
  const { selectedChild, loading } = useChildContext();
  const queryClient = useQueryClient();
  const pushToast = useAppStore((s) => s.pushToast);
  const childId = selectedChild?.id;

  const rewards = useQuery({
    queryKey: queryKeys.rewards(childId ?? "none"),
    queryFn: () => fetchRewards(childId as string),
    enabled: Boolean(childId),
  });
  const achievements = useQuery({
    queryKey: queryKeys.achievements(childId ?? "none"),
    queryFn: () => fetchAchievements(childId as string),
    enabled: Boolean(childId),
  });

  const claim = useMutation({
    mutationFn: (rewardId: string) => claimReward(childId as string, rewardId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["children"] });
      pushToast({ title: "Yours!", description: "Reward claimed", tone: "mint", glyph: "🎁" });
    },
    onError: () => pushToast({ title: "Not enough stars yet", tone: "coral", glyph: "⭐" }),
  });

  if (loading || !selectedChild) return <KidLoading message="Opening your rewards…" />;

  const stars = selectedChild.progress?.stars ?? 0;
  const unlocked = (achievements.data ?? []).filter((achievement) => achievement.unlockedAt);

  return (
    <div className="space-y-6">
      <KidPageHeader glyph="🏆" title={t("kid.myRewards")} subtitle={`You have ${stars} stars to spend`} />

      <section className="grid gap-3 sm:grid-cols-4">
        {MEDAL_TIERS.map((tier) => {
          const owned = unlocked.filter((a) => a.tier === tier.tier).length;
          return (
            <div
              key={tier.tier}
              className={cn(
                "flex flex-col items-center rounded-2xl border-2 border-border p-4 text-center",
                owned > 0 ? toneStyles[tier.tone].soft : "bg-surface",
              )}
            >
              <span className={cn("text-4xl", owned === 0 && "opacity-40 grayscale")} aria-hidden>
                {tier.glyph}
              </span>
              <p className="font-display mt-1.5 text-base font-extrabold text-content">{tier.label}</p>
              <p className="t-caption font-bold text-content-secondary">
                {owned > 0 ? `${owned} earned` : t("rewards.locked")}
              </p>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="kid-store">
        <h2 id="kid-store" className="font-display mb-3 text-xl font-extrabold text-content">
          Star shop
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(rewards.data ?? []).map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              stars={stars}
              claiming={claim.isPending}
              onClaim={(rewardId) => claim.mutate(rewardId)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="kid-all-medals">
        <h2 id="kid-all-medals" className="font-display mb-3 text-xl font-extrabold text-content">
          {t("nav.achievements")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(achievements.data ?? []).map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} compact />
          ))}
        </div>
      </section>
    </div>
  );
}
