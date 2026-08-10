import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import type { ContentStatus, Difficulty } from "@/types";

export function Badge({
  tone = "brand",
  size = "md",
  icon,
  className,
  children,
}: {
  tone?: Tone;
  size?: "sm" | "md";
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const style = toneStyles[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-xs",
        style.soft,
        style.ink,
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const statusTone: Record<ContentStatus, Tone> = {
  draft: "sky",
  review: "sun",
  published: "mint",
  archived: "coral",
};

const statusLabel: Record<ContentStatus, string> = {
  draft: "Draft",
  review: "Review",
  published: "Published",
  archived: "Archived",
};

/** Content workflow state — one visual language across lessons, games and media. */
export function StatusBadge({ status, className }: { status: ContentStatus; className?: string }) {
  return (
    <Badge tone={statusTone[status]} size="sm" className={className}>
      <span className={cn("h-1.5 w-1.5 rounded-full", toneStyles[statusTone[status]].solid)} aria-hidden />
      {statusLabel[status]}
    </Badge>
  );
}

const difficultyTone: Record<Difficulty, Tone> = { easy: "mint", medium: "sun", hard: "coral" };

export function DifficultyBadge({ difficulty, label }: { difficulty: Difficulty; label: string }) {
  return (
    <Badge tone={difficultyTone[difficulty]} size="sm">
      <span aria-hidden>{difficulty === "easy" ? "●" : difficulty === "medium" ? "●●" : "●●●"}</span>
      {label}
    </Badge>
  );
}

/** Numeric delta with direction encoded in both colour and glyph (never colour alone). */
export function DeltaBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold",
        positive ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      <span aria-hidden>{positive ? "▲" : "▼"}</span>
      {positive ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

/** Small count bubble used on nav items and bell icons. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[0.6875rem] font-bold text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
