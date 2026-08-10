"use client";

import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

const LEVEL_CLASSES = [
  "bg-surface-muted",
  "bg-brand-200 dark:bg-brand-500/25",
  "bg-brand-300 dark:bg-brand-500/45",
  "bg-brand-400 dark:bg-brand-500/70",
  "bg-brand-500",
] as const;

const LEVEL_LABEL = ["No activity", "A little", "Some", "A lot", "Excellent"] as const;

/**
 * Learning-consistency grid. Intensity is the primary encoding, but every cell
 * carries a text label through its tooltip and `title`, so the pattern is
 * available without colour perception.
 */
export function HeatGrid({
  values,
  columns = 7,
  columnLabels = ["M", "T", "W", "T", "F", "S", "S"],
  className,
  ariaLabel = "Learning consistency",
}: {
  values: number[];
  columns?: number;
  columnLabels?: string[];
  className?: string;
  ariaLabel?: string;
}) {
  const rows = Math.ceil(values.length / columns);

  return (
    <div className={cn("w-full", className)}>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`${ariaLabel}: ${values.filter((v) => v > 0).length} active days out of ${values.length}`}
      >
        {columnLabels.map((label, i) => (
          <span key={`${label}-${i}`} className="t-caption pb-1 text-center font-semibold text-content-tertiary">
            {label}
          </span>
        ))}
        {values.map((level, index) => {
          const weeksAgo = rows - 1 - Math.floor(index / columns);
          return (
            <Tooltip
              key={index}
              content={`${LEVEL_LABEL[Math.min(level, 4)]} · ${weeksAgo === 0 ? "this week" : `${weeksAgo} weeks ago`}`}
            >
              <span
                tabIndex={0}
                title={LEVEL_LABEL[Math.min(level, 4)]}
                className={cn(
                  "block aspect-square w-full rounded-[0.4rem] transition-transform duration-150 hover:scale-110",
                  LEVEL_CLASSES[Math.min(level, 4)],
                )}
              />
            </Tooltip>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5">
        <span className="t-caption text-content-tertiary">Less</span>
        {LEVEL_CLASSES.map((cls, i) => (
          <span key={i} className={cn("h-3 w-3 rounded-[0.25rem]", cls)} aria-hidden />
        ))}
        <span className="t-caption text-content-tertiary">More</span>
      </div>
    </div>
  );
}
