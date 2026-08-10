"use client";

import { calculateAge, cn, formatDuration } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import { useAppStore, useGains } from "@/store/app-store";
import { getChild, NOW } from "@/data/children";
import { achievements, medalTiers, rewards } from "@/data/rewards";
import { buildLeaderboard, consistencyGrid } from "@/data/analytics";
import { Avatar } from "@/components/ui/avatar";
import { ProgressRing, XpBar } from "@/components/ui/progress";
import { HeatGrid } from "@/components/charts/heat-grid";
import { AchievementCard, RewardCard } from "@/features/rewards/achievement-card";
import { LeaderboardList } from "@/features/rewards/leaderboard-list";
import { Mascot } from "@/components/kid/mascot";
import { KidPageHeader } from "./kid-library";

/** Big, celebratory stat tile for the child's own screens. */
function KidStat({ glyph, value, label, tone }: { glyph: string; value: string | number; label: string; tone: keyof typeof toneStyles }) {
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
  const childId = useAppStore((s) => s.selectedChildId);
  const child = getChild(childId);
  const gains = useGains(childId);

  const unlocked = achievements.filter((a) => a.progress >= 100);
  const nextUp = achievements.filter((a) => a.progress < 100).sort((a, b) => b.progress - a.progress)[0];

  return (
    <div className="space-y-6">
      {/* ---- Playful hero -------------------------------------------------- */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl border-2 border-border p-6 text-center shadow-soft",
          toneStyles[child.avatar.tone].soft,
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.85), transparent 55%)" }}
        />
        <div className="relative">
          <Avatar spec={child.avatar} size="2xl" className="mx-auto ring-4 ring-surface shadow-card" label={`${child.name}'s avatar`} />
          <h1 className="font-display mt-4 text-3xl font-extrabold text-content">{child.name}</h1>
          <p className="t-body-sm mt-0.5 font-bold text-content-secondary">
            {calculateAge(child.birthDate, NOW)} years old · Level {child.level}
          </p>

          <div className="mx-auto mt-5 max-w-md">
            <XpBar xp={child.xp + gains.xp} xpToNext={child.xpToNextLevel} level={child.level} />
          </div>
        </div>
      </section>

      {/* ---- Stats --------------------------------------------------------- */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KidStat glyph="⭐" value={child.stars + gains.stars} label={t("common.stars")} tone="sun" />
        <KidStat glyph="🔥" value={child.streakDays} label={t("common.streak")} tone="coral" />
        <KidStat glyph="📗" value={child.lessonsCompleted + gains.lessonsCompleted} label={t("nav.lessons")} tone="mint" />
        <KidStat glyph="⏱️" value={formatDuration(child.minutesLearned + gains.minutes)} label="Time" tone="sky" />
      </section>

      {/* ---- Next medal ---------------------------------------------------- */}
      {nextUp ? (
        <section className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-border bg-surface p-5 shadow-soft">
          <ProgressRing value={nextUp.progress} size={92} thickness={9} tone={nextUp.tone} label={`${nextUp.progress}% towards ${nextUp.title}`}>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {unlocked.slice(0, 8).map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} compact />
          ))}
        </div>
      </section>

      {/* ---- Streak calendar ------------------------------------------------ */}
      <section className="rounded-3xl border-2 border-border bg-surface p-5 shadow-soft">
        <h2 className="font-display mb-3 text-xl font-extrabold text-content">My learning days</h2>
        <HeatGrid values={consistencyGrid[childId] ?? []} ariaLabel="Days learned" />
      </section>

      {/* ---- Leaderboard ---------------------------------------------------- */}
      <section className="rounded-3xl border-2 border-border bg-surface p-5 shadow-soft">
        <h2 className="font-display mb-3 text-xl font-extrabold text-content">{t("nav.leaderboard")}</h2>
        <LeaderboardList entries={buildLeaderboard(childId).slice(0, 6)} />
      </section>
    </div>
  );
}

export function KidRewardsView() {
  const t = useT();
  const childId = useAppStore((s) => s.selectedChildId);
  const child = getChild(childId);
  const gains = useGains(childId);
  const stars = child.stars + gains.stars;
  const unlocked = achievements.filter((a) => a.progress >= 100);

  return (
    <div className="space-y-6">
      <KidPageHeader glyph="🏆" title={t("kid.myRewards")} subtitle={`You have ${stars} stars to spend`} />

      <section className="grid gap-3 sm:grid-cols-4">
        {medalTiers.map((tier) => {
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
          {rewards.map((reward) => (
            <RewardCard key={reward.id} reward={reward} stars={stars} />
          ))}
        </div>
      </section>

      <section aria-labelledby="kid-all-medals">
        <h2 id="kid-all-medals" className="font-display mb-3 text-xl font-extrabold text-content">
          {t("nav.achievements")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {achievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} compact />
          ))}
        </div>
      </section>
    </div>
  );
}
