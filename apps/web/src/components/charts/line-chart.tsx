"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import type { MultiSeries } from "@/types";
import { geometry, nearestIndex, niceMax, pointerToSvgX, smoothPath, ticksFor } from "./primitives";

const VIEW_W = 660;
const VIEW_H = 260;

/**
 * Multi-series line chart for admin analytics. Series are distinguished by
 * colour *and* by an always-visible legend with matching markers.
 */
export function MultiLineChart({
  series,
  className,
  ariaLabel,
  normalise = true,
}: {
  series: MultiSeries[];
  className?: string;
  ariaLabel?: string;
  /** Scale every series to its own maximum so small series stay readable. */
  normalise?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const geo = geometry(VIEW_W, VIEW_H, { left: 40, right: 16, top: 20, bottom: 34 });

  const globalMax = niceMax(Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value))));
  const step = labels.length > 1 ? geo.innerWidth / (labels.length - 1) : 0;
  const baseline = geo.padTop + geo.innerHeight;

  return (
    <figure className={cn("w-full", className)}>
      <figcaption className="sr-only">
        {ariaLabel ?? "Comparison chart"}.{" "}
        {series.map((s) => `${s.name}: ${s.points.map((p) => `${p.label} ${p.value}`).join(", ")}`).join(". ")}
      </figcaption>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => setActive(nearestIndex(pointerToSvgX(e, VIEW_W), labels.length, geo))}
        onPointerLeave={() => setActive(null)}
      >
        {ticksFor(100, 4).map((pct) => {
          const y = geo.padTop + geo.innerHeight - (pct / 100) * geo.innerHeight;
          return (
            <g key={pct}>
              <line x1={geo.padLeft} x2={VIEW_W - geo.padRight} y1={y} y2={y} stroke="var(--border)" strokeDasharray="4 6" />
              {!normalise ? (
                <text x={geo.padLeft - 10} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-tertiary)">
                  {Math.round((globalMax * pct) / 100)}
                </text>
              ) : null}
            </g>
          );
        })}

        {series.map((s) => {
          const max = normalise ? niceMax(Math.max(1, ...s.points.map((p) => p.value))) : globalMax;
          const coords = s.points.map<[number, number]>((p, i) => [
            geo.padLeft + step * i,
            geo.padTop + geo.innerHeight - (p.value / max) * geo.innerHeight,
          ]);
          return (
            <g key={s.name}>
              <path
                d={smoothPath(coords)}
                fill="none"
                stroke={toneStyles[s.tone].hex}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {coords.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={active === i ? 5.5 : 3}
                  fill="var(--surface)"
                  stroke={toneStyles[s.tone].hex}
                  strokeWidth={2.5}
                />
              ))}
            </g>
          );
        })}

        {active !== null ? (
          <line
            x1={geo.padLeft + step * active}
            x2={geo.padLeft + step * active}
            y1={geo.padTop}
            y2={baseline}
            stroke="var(--text-tertiary)"
            strokeOpacity="0.4"
            strokeWidth={1.5}
          />
        ) : null}

        {labels.map((label, i) => (
          <text
            key={label}
            x={geo.padLeft + step * i}
            y={VIEW_H - 10}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={active === i ? "var(--text-primary)" : "var(--text-tertiary)"}
          >
            {label}
          </text>
        ))}
      </svg>

      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", toneStyles[s.tone].solid)} aria-hidden />
            <span className="t-caption font-semibold text-content-secondary">
              {s.name}
              {active !== null ? (
                <span className="ml-1 font-bold text-content tabular-nums">
                  {s.points[active]?.value.toLocaleString()}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
