"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";

export interface DonutSlice {
  label: string;
  value: number;
  tone: Tone;
}

/** Arc path for a donut segment, drawn from `from`% to `to`% of the circle. */
function arc(cx: number, cy: number, radius: number, from: number, to: number): string {
  const start = (from / 100) * Math.PI * 2 - Math.PI / 2;
  const end = (to / 100) * Math.PI * 2 - Math.PI / 2;
  const x1 = cx + radius * Math.cos(start);
  const y1 = cy + radius * Math.sin(start);
  const x2 = cx + radius * Math.cos(end);
  const y2 = cy + radius * Math.sin(end);
  const largeArc = to - from > 50 ? 1 : 0;
  return `M${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2}`;
}

export function DonutChart({
  slices,
  size = 200,
  thickness = 26,
  centre,
  className,
  ariaLabel,
  legend = true,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centre?: ReactNode;
  className?: string;
  ariaLabel?: string;
  legend?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - thickness) / 2;

  // Running offsets are derived, not accumulated in a render-scoped variable, so
  // the component stays a pure function of its props.
  const segments = slices.map((slice, index) => {
    const before = slices.slice(0, index).reduce((sum, s) => sum + s.value, 0);
    const from = (before / total) * 100;
    const to = ((before + slice.value) / total) * 100;
    // A hairline gap keeps adjacent segments legible without a stroke outline.
    return { ...slice, d: arc(size / 2, size / 2, radius, from, Math.max(from + 0.4, to - 0.6)) };
  });

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-6", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={ariaLabel}>
          <title>{ariaLabel ?? "Distribution"}</title>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-muted)"
            strokeWidth={thickness}
          />
          {segments.map((segment, i) => (
            <path
              key={segment.label}
              d={segment.d}
              fill="none"
              stroke={toneStyles[segment.tone].hex}
              strokeWidth={active === i ? thickness + 6 : thickness}
              strokeLinecap="round"
              opacity={active === null || active === i ? 1 : 0.4}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              className="cursor-default transition-all duration-200"
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          {active === null ? (
            centre
          ) : (
            <div>
              <p className="t-h2 text-content tabular-nums">{Math.round((segments[active].value / total) * 100)}%</p>
              <p className="t-caption font-semibold text-content-secondary">{segments[active].label}</p>
            </div>
          )}
        </div>
      </div>

      {legend ? (
        <ul className="min-w-40 space-y-2.5">
          {segments.map((segment, i) => (
            <li
              key={segment.label}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", toneStyles[segment.tone].solid)} aria-hidden />
                <span className="t-body-sm text-content-secondary">{segment.label}</span>
              </span>
              <span className="t-body-sm font-bold text-content tabular-nums">
                {Math.round((segment.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
