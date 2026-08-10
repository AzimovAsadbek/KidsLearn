"use client";

import { cn } from "@/lib/utils";
import type { LeaderboardEntryDto } from "@kidslearn/types";
import type { Tone } from "@/lib/tone";
import { Avatar } from "@/components/ui/avatar";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Child-safe leaderboard: display name, illustrated avatar and two public
 * scores. The current child is highlighted with a border and a label, not just
 * a background tint.
 */
export function LeaderboardList({
  entries,
  compact = false,
}: {
  entries: LeaderboardEntryDto[];
  compact?: boolean;
}) {
  return (
    <ol className="space-y-1.5">
      {entries.map((entry) => (
        <li key={`${entry.rank}-${entry.childId}`}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
              entry.isCurrentChild
                ? "border-2 border-primary bg-primary-soft"
                : "border-2 border-transparent hover:bg-surface-muted",
            )}
          >
            <span
              className={cn(
                "grid w-7 shrink-0 place-items-center text-sm font-extrabold tabular-nums",
                entry.rank <= 3 ? "text-lg" : "text-content-tertiary",
              )}
              aria-label={`Rank ${entry.rank}`}
            >
              {entry.rank <= 3 ? MEDALS[entry.rank - 1] : entry.rank}
            </span>

            <Avatar spec={{ glyph: entry.avatarGlyph, tone: entry.avatarTone as Tone }} size={compact ? "xs" : "sm"} />

            <span className="min-w-0 flex-1">
              <span className="t-body-sm block truncate font-semibold text-content">
                {entry.displayName}
                {entry.isCurrentChild ? (
                  <span className="t-caption ml-1.5 rounded-full bg-primary px-1.5 py-0.5 font-bold text-primary-on">
                    You
                  </span>
                ) : null}
              </span>
              {!compact ? (
                <span className="t-caption block text-content-secondary tabular-nums">{entry.xp} XP</span>
              ) : null}
            </span>

            <span className="t-label flex shrink-0 items-center gap-1 text-content tabular-nums">
              <span aria-hidden>⭐</span>
              {entry.stars}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Podium header for the full leaderboard page. */
export function LeaderboardPodium({ entries }: { entries: LeaderboardEntryDto[] }) {
  const [first, second, third] = entries;
  if (!first) return null;

  const order = [
    { entry: second, height: "h-20", place: 2, tone: "bg-surface-muted" },
    { entry: first, height: "h-28", place: 1, tone: "bg-gradient-to-b from-sun-core to-tangerine-core" },
    { entry: third, height: "h-16", place: 3, tone: "bg-surface-muted" },
  ];

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6">
      {order.map(({ entry, height, place, tone }) =>
        entry ? (
          <div key={entry.childId} className="flex w-24 flex-col items-center sm:w-32">
            <span className="mb-2 text-2xl" aria-hidden>
              {MEDALS[place - 1]}
            </span>
            <Avatar
              spec={{ glyph: entry.avatarGlyph, tone: entry.avatarTone as Tone }}
              size={place === 1 ? "xl" : "lg"}
              className={cn("ring-4", entry.isCurrentChild ? "ring-primary" : "ring-surface")}
            />
            <p className="t-body-sm mt-2 max-w-full truncate font-bold text-content">{entry.displayName}</p>
            <p className="t-caption font-semibold text-content-secondary tabular-nums">⭐ {entry.stars}</p>
            <div
              className={cn(
                "mt-3 grid w-full place-items-center rounded-t-lg text-2xl font-extrabold text-white",
                height,
                tone,
              )}
            >
              <span className={place === 1 ? "text-white" : "text-content-tertiary"}>{place}</span>
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
