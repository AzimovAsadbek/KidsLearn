"use client";

import { cn, clamp } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useI18n } from "@/i18n/provider";

export function ProgressBar({
  value,
  tone = "brand",
  size = "md",
  label,
  showValue = false,
  className,
}: {
  value: number;
  tone?: Tone;
  size?: "xs" | "sm" | "md" | "lg";
  label?: string;
  showValue?: boolean;
  className?: string;
}) {
  const pct = clamp(Math.round(value), 0, 100);
  const heights = { xs: "h-1", sm: "h-1.5", md: "h-2.5", lg: "h-4" };

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label ? <span className="t-caption font-semibold text-content-secondary">{label}</span> : <span />}
          {showValue ? <span className="t-caption font-bold text-content tabular-nums">{pct}%</span> : null}
        </div>
      )}
      <div
        className={cn("w-full overflow-hidden rounded-full bg-surface-muted", heights[size])}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", toneStyles[tone].solid)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Circular progress. Rendered as SVG so it scales cleanly and stays crisp on the
 * large child-facing surfaces.
 */
export function ProgressRing({
  value,
  size = 96,
  thickness = 10,
  tone = "brand",
  children,
  className,
  label,
}: {
  value: number;
  size?: number;
  thickness?: number;
  tone?: Tone;
  children?: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const pct = clamp(value, 0, 100);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={toneStyles[tone].hex}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms var(--ease-out-soft)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** XP bar with the level badges on either end — the child's core status object. */
export function XpBar({
  xp,
  xpToNext,
  level,
  className,
}: {
  xp: number;
  xpToNext: number;
  level: number;
  className?: string;
}) {
  const { intlLocale } = useI18n();
  const pct = clamp(Math.round((xp / xpToNext) * 100), 0, 100);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LevelChip level={level} />
      <div className="flex-1">
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={xp}
          aria-valuemin={0}
          aria-valuemax={xpToNext}
          aria-label={`Level ${level} progress`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="t-caption mt-1 font-semibold text-content-secondary tabular-nums">
          {xp.toLocaleString(intlLocale)} / {xpToNext.toLocaleString(intlLocale)} XP
        </p>
      </div>
      <LevelChip level={level + 1} muted />
    </div>
  );
}

export function LevelChip({ level, muted = false }: { level: number; muted?: boolean }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-extrabold",
        muted ? "bg-surface-muted text-content-tertiary" : "bg-primary text-primary-on shadow-soft",
      )}
      aria-label={`Level ${level}`}
    >
      {level}
    </span>
  );
}

/** Step dots for lesson and onboarding flows. */
export function StepDots({
  total,
  current,
  className,
}: {
  total: number;
  current: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i < current ? "w-2 bg-primary" : i === current ? "w-6 bg-primary" : "w-2 bg-border-strong",
          )}
        />
      ))}
    </div>
  );
}
