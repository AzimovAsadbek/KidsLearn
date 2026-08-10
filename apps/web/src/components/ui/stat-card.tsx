import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";

/**
 * The dashboard's atomic unit: a tinted card with an oversized value, a delta
 * line and an illustrated chip. Parent and admin dashboards both build from it.
 */
export function StatCard({
  label,
  value,
  unit,
  delta,
  glyph,
  tone = "brand",
  footnote,
  className,
  href,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  delta?: { value: number; label?: string; suffix?: string };
  glyph: ReactNode;
  tone?: Tone;
  footnote?: ReactNode;
  className?: string;
  href?: string;
}) {
  const style = toneStyles[tone];
  const Wrapper = href ? "a" : "div";

  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border p-5 transition-shadow duration-200",
        style.soft,
        style.border,
        href && "hover:shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("t-label", style.ink)}>{label}</p>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="t-h1 font-extrabold text-content tabular-nums">{value}</span>
            {unit ? <span className="t-body-sm font-semibold text-content-secondary">{unit}</span> : null}
          </p>
        </div>
        <span
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-md bg-surface/70 text-2xl shadow-soft backdrop-blur-sm",
            "transition-transform duration-300 group-hover:scale-105",
          )}
          aria-hidden
        >
          {glyph}
        </span>
      </div>

      {delta ? (
        <p className="t-caption mt-3 flex items-center gap-1 font-semibold text-content-secondary">
          <span
            className={cn("font-bold", delta.value >= 0 ? "text-success" : "text-danger")}
            aria-hidden
          >
            {delta.value >= 0 ? "▲" : "▼"} {delta.value >= 0 ? "+" : ""}
            {delta.value}
            {delta.suffix ?? ""}
          </span>
          {delta.label}
        </p>
      ) : footnote ? (
        <p className="t-caption mt-3 font-semibold text-content-secondary">{footnote}</p>
      ) : null}
    </Wrapper>
  );
}

/** Denser variant used in admin headers where six metrics share one row. */
export function MiniStat({
  label,
  value,
  glyph,
  tone = "brand",
  delta,
}: {
  label: ReactNode;
  value: ReactNode;
  glyph: ReactNode;
  tone?: Tone;
  delta?: number;
}) {
  const style = toneStyles[tone];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-sm text-xl", style.soft)} aria-hidden>
        {glyph}
      </span>
      <div className="min-w-0 flex-1">
        <p className="t-caption truncate font-semibold text-content-secondary">{label}</p>
        <p className="t-h3 text-content tabular-nums">{value}</p>
      </div>
      {typeof delta === "number" ? (
        <span className={cn("t-caption font-bold", delta >= 0 ? "text-success" : "text-danger")}>
          {delta >= 0 ? "+" : ""}
          {delta}%
        </span>
      ) : null}
    </div>
  );
}
