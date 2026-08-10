"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import type { TimeSeriesPoint } from "@/types";
import { geometry, nearestIndex, pointerToSvgX, scales, smoothPath, ticksFor } from "./primitives";

const VIEW_W = 640;
const VIEW_H = 260;

/**
 * Single-series area chart with a crosshair readout. The active value is also
 * announced in text below the plot, so the data never lives in colour alone.
 */
export function AreaChart({
  points,
  tone = "brand",
  valueSuffix = "",
  className,
  ariaLabel,
  summaryLabel,
}: {
  points: TimeSeriesPoint[];
  tone?: Tone;
  valueSuffix?: string;
  className?: string;
  ariaLabel?: string;
  summaryLabel?: string;
}) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const geo = geometry(VIEW_W, VIEW_H, { left: 40, right: 16, top: 20, bottom: 34 });
  const scale = scales(points, geo);
  const coords = points.map<[number, number]>((p, i) => [scale.x(i), scale.y(p.value)]);
  const line = smoothPath(coords);
  const baseline = geo.padTop + geo.innerHeight;
  const area =
    coords.length > 0
      ? `${line} L${coords[coords.length - 1][0]},${baseline} L${coords[0][0]},${baseline} Z`
      : "";
  const color = toneStyles[tone].hex;

  return (
    <figure className={cn("w-full", className)}>
      <figcaption className="sr-only">
        {ariaLabel ?? "Trend chart"}: {points.map((p) => `${p.label} ${p.value}${valueSuffix}`).join(", ")}
      </figcaption>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => setActive(nearestIndex(pointerToSvgX(e, VIEW_W), points.length, geo))}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticksFor(scale.max).map((tick) => (
          <g key={tick}>
            <line
              x1={geo.padLeft}
              x2={VIEW_W - geo.padRight}
              y1={scale.y(tick)}
              y2={scale.y(tick)}
              stroke="var(--border)"
              strokeDasharray="4 6"
              strokeWidth={1}
            />
            <text
              x={geo.padLeft - 10}
              y={scale.y(tick) + 4}
              textAnchor="end"
              fill="var(--text-tertiary)"
              fontSize="11"
              fontWeight="500"
            >
              {tick}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" />

        {active !== null && coords[active] ? (
          <line
            x1={coords[active][0]}
            x2={coords[active][0]}
            y1={geo.padTop}
            y2={baseline}
            stroke={color}
            strokeOpacity="0.35"
            strokeWidth={1.5}
          />
        ) : null}

        {coords.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={active === i ? 6.5 : 4}
            fill="var(--surface)"
            stroke={color}
            strokeWidth={active === i ? 3.5 : 2.5}
            className="transition-all duration-150"
          />
        ))}

        {points.map((p, i) => (
          <text
            key={p.label}
            x={scale.x(i)}
            y={VIEW_H - 10}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={active === i ? "var(--text-primary)" : "var(--text-tertiary)"}
          >
            {p.label}
          </text>
        ))}
      </svg>

      <p className="t-caption mt-1 flex items-center justify-center gap-2 font-semibold text-content-secondary" role="status">
        <span className={cn("h-2 w-2 rounded-full", toneStyles[tone].solid)} aria-hidden />
        {active === null
          ? (summaryLabel ?? `${points.length} data points`)
          : `${points[active].label} · ${points[active].value}${valueSuffix}`}
      </p>
    </figure>
  );
}
