import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";

/* ============================================================================
   Skeletons — every async surface gets a shape-matched placeholder, never a
   blank screen and never a bare spinner on a full page.
   ========================================================================== */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-sm", className)} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-5 shadow-soft", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="mt-5 h-2 w-full rounded-full" />
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-start justify-between">
            <div className="w-full space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex gap-4 border-b border-border bg-surface-muted px-5 py-3.5">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className={cn("h-3 flex-1", c === 0 && "max-w-40")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-6 shadow-soft", className)}>
      <Skeleton className="h-4 w-40" />
      <div className="mt-6 flex h-48 items-end gap-3" aria-hidden="true">
        {[45, 70, 55, 85, 60, 95, 72].map((height, i) => (
          <div key={i} className="shimmer flex-1 rounded-t-sm" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   Empty / error / offline
   ========================================================================== */

export function EmptyState({
  glyph = "🗂️",
  title,
  body,
  action,
  tone = "brand",
  compact = false,
  className,
}: {
  glyph?: string;
  title: string;
  body?: string;
  action?: ReactNode;
  tone?: Tone;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface text-center",
        compact ? "px-6 py-10" : "px-6 py-16",
        className,
      )}
    >
      <div
        className={cn(
          "grid place-items-center rounded-2xl text-4xl",
          compact ? "h-16 w-16" : "h-20 w-20 text-5xl",
          toneStyles[tone].soft,
        )}
        aria-hidden
      >
        {glyph}
      </div>
      <h3 className="t-h3 mt-5 text-content">{title}</h3>
      {body ? <p className="t-body-sm mt-1.5 max-w-sm text-balance text-content-secondary">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-danger/25 bg-danger-soft/40 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="grid h-20 w-20 place-items-center rounded-2xl bg-danger-soft text-5xl" aria-hidden>
        😕
      </div>
      <h3 className="t-h3 mt-5 text-content">{title}</h3>
      {body ? <p className="t-body-sm mt-1.5 max-w-sm text-balance text-content-secondary">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/** Inline strip used when a section fails but the page around it is fine. */
export function InlineError({ message, onRetry, retryLabel = "Try again" }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3"
    >
      <p className="t-body-sm font-medium text-content">
        <span aria-hidden className="mr-2">
          ⚠️
        </span>
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="t-label rounded-xs border border-danger/40 px-3 py-1.5 text-danger hover:bg-danger/10"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
