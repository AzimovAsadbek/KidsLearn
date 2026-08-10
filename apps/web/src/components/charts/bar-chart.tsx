"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import type { TimeSeriesPoint } from "@/types";
import { geometry, scales, ticksFor } from "./primitives";

const VIEW_W = 640;
const VIEW_H = 240;

export function BarChart({
  points,
  tone = "brand",
  valueSuffix = "",
  className,
  ariaLabel,
  rounded = 8,
}: {
  points: TimeSeriesPoint[];
  tone?: Tone;
  valueSuffix?: string;
  className?: string;
  ariaLabel?: string;
  rounded?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const geo = geometry(VIEW_W, VIEW_H, { left: 40, right: 12, top: 18, bottom: 32 });
  const scale = scales(points, geo);
  const slot = geo.innerWidth / Math.max(points.length, 1);
  const barWidth = Math.min(46, slot * 0.56);
  const color = toneStyles[tone].hex;
  const baseline = geo.padTop + geo.innerHeight;

  return (
    <figure className={cn("w-full", className)}>
      <figcaption className="sr-only">
        {ariaLabel ?? "Bar chart"}: {points.map((p) => `${p.label} ${p.value}${valueSuffix}`).join(", ")}
      </figcaption>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        {ticksFor(scale.max).map((tick) => (
          <g key={tick}>
            <line
              x1={geo.padLeft}
              x2={VIEW_W - geo.padRight}
              y1={scale.y(tick)}
              y2={scale.y(tick)}
              stroke="var(--border)"
              strokeDasharray="4 6"
            />
            <text
              x={geo.padLeft - 10}
              y={scale.y(tick) + 4}
              textAnchor="end"
              fontSize="11"
              fontWeight="500"
              fill="var(--text-tertiary)"
            >
              {tick}
            </text>
          </g>
        ))}

        {points.map((point, i) => {
          const x = geo.padLeft + slot * i + (slot - barWidth) / 2;
          const y = scale.y(point.value);
          const h = Math.max(2, baseline - y);
          return (
            <g
              key={point.label}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              className="cursor-default"
            >
              {/* Invisible hit area keeps thin bars easy to hover. */}
              <rect x={geo.padLeft + slot * i} y={geo.padTop} width={slot} height={geo.innerHeight} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={rounded}
                fill={color}
                opacity={active === null || active === i ? 1 : 0.35}
                className="transition-opacity duration-200"
              />
              {active === i ? (
                <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-primary)">
                  {point.value}
                  {valueSuffix}
                </text>
              ) : null}
              <text
                x={x + barWidth / 2}
                y={VIEW_H - 10}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={active === i ? "var(--text-primary)" : "var(--text-tertiary)"}
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** Compact inline trend, no axes — used inside stat cards and table rows. */
export function Sparkline({
  points,
  tone = "brand",
  className,
}: {
  points: TimeSeriesPoint[];
  tone?: Tone;
  className?: string;
}) {
  const width = 120;
  const height = 34;
  const max = Math.max(1, ...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const range = Math.max(1, max - min);
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${i * step},${height - ((p.value - min) / range) * (height - 6) - 3}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-8 w-28", className)} aria-hidden="true">
      <path d={d} fill="none" stroke={toneStyles[tone].hex} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
