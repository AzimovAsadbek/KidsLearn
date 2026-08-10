"use client";

import { Lock } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useI18n } from "@/i18n/provider";
import type { AchievementDto, MedalTier, RewardDto } from "@kidslearn/types";
import { ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const TIER_RING: Record<MedalTier, string> = {
  BRONZE: "from-tangerine-core to-tangerine-deep",
  SILVER: "from-slate-300 to-slate-400",
  GOLD: "from-sun-core to-tangerine-core",
  DIAMOND: "from-lagoon-core to-sky-core",
};

const TIER_LABEL: Record<MedalTier, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  DIAMOND: "Diamond",
};

/**
 * Achievements read as collectibles: a metal ring, an embossed glyph, and a
 * locked state that is dimmed *and* explicitly labelled rather than colour-only.
 */
export function AchievementCard({
  achievement,
  compact = false,
}: {
  achievement: AchievementDto;
  compact?: boolean;
}) {
  const { intlLocale } = useI18n();
  const unlocked = achievement.unlockedAt !== null;

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center rounded-xl border p-4 text-center transition-all duration-300",
        unlocked
          ? "border-border bg-surface shadow-soft hover:-translate-y-1 hover:shadow-card"
          : "border-dashed border-border-strong bg-surface-muted",
      )}
    >
      <div className="relative">
        <span
          className={cn(
            "grid place-items-center rounded-full bg-gradient-to-br p-[3px]",
            compact ? "h-14 w-14" : "h-16 w-16",
            unlocked ? TIER_RING[achievement.tier] : "from-border-strong to-border",
          )}
          aria-hidden
        >
          <span
            className={cn(
              "grid h-full w-full place-items-center rounded-full bg-surface",
              compact ? "text-2xl" : "text-3xl",
              !unlocked && "opacity-45 grayscale",
            )}
          >
            {achievement.glyph}
          </span>
        </span>

        {!unlocked ? (
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-surface bg-surface-muted text-content-tertiary">
            <Lock className="h-3 w-3" aria-hidden />
          </span>
        ) : null}
      </div>

      <h4 className={cn("mt-3 text-content", compact ? "t-body-sm font-semibold" : "t-h4")}>
        {achievement.title}
      </h4>
      {!compact ? (
        <p className="t-caption mt-1 line-clamp-2 text-content-secondary">{achievement.description}</p>
      ) : null}

      {unlocked ? (
        <p className="t-caption mt-2 font-semibold text-success">
          {TIER_LABEL[achievement.tier]} · Earned
          {achievement.unlockedAt ? ` ${formatDate(achievement.unlockedAt, intlLocale)}` : ""}
        </p>
      ) : (
        <div className="mt-3 w-full">
          <ProgressBar value={achievement.progress} tone={achievement.tone as Tone} size="sm" />
          <p className="t-caption mt-1.5 font-semibold text-content-tertiary">
            Locked · {achievement.progress}% complete
          </p>
        </div>
      )}

      {!compact ? (
        <span className="mt-3">
          <Badge tone={unlocked ? (achievement.tone as Tone) : "sky"} size="sm">
            +{achievement.xpReward} XP
          </Badge>
        </span>
      ) : null}
    </div>
  );
}

/** Redeemable reward tile — shows the star price and whether it's claimed. */
export function RewardCard({
  reward,
  stars,
  onClaim,
  claiming,
}: {
  reward: RewardDto;
  stars: number;
  onClaim?: (rewardId: string) => void;
  claiming?: boolean;
}) {
  const affordable = stars >= reward.costStars;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-4 transition-all duration-300",
        reward.claimed ? "border-border bg-surface shadow-soft" : "border-border bg-surface",
        !reward.claimed && !affordable && "opacity-70",
      )}
    >
      <span
        className={cn("grid h-14 w-14 place-items-center rounded-lg text-3xl", toneStyles[reward.tone as Tone].soft)}
        aria-hidden
      >
        {reward.glyph}
      </span>
      <h4 className="t-h4 mt-3 text-content">{reward.title}</h4>
      <p className="t-caption mt-1 flex-1 text-content-secondary">{reward.description}</p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="t-label flex items-center gap-1 text-content">
          <span aria-hidden>⭐</span>
          {reward.costStars}
        </span>
        {reward.claimed ? (
          <Badge tone="mint" size="sm">
            ✓ Claimed
          </Badge>
        ) : (
          <button
            type="button"
            disabled={!affordable || claiming}
            onClick={() => onClaim?.(reward.id)}
            className={cn(
              "t-label rounded-sm px-3 py-1.5 transition-colors",
              affordable
                ? "bg-primary text-primary-on hover:bg-primary-hover"
                : "cursor-not-allowed bg-surface-muted text-content-tertiary",
            )}
          >
            {affordable ? "Claim" : `${reward.costStars - stars} more`}
          </button>
        )}
      </div>
    </div>
  );
}
