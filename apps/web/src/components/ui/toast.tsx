"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/i18n/provider";

/**
 * Toast viewport. Mounted once in the root layout; anything in the app can
 * publish through `useAppStore().pushToast`.
 */
export function ToastViewport() {
  const t = useT();
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:items-end"
      role="region"
      aria-label={t("common.notifications")}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={cn(
            "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface p-3.5 shadow-pop",
            "animate-rise",
          )}
        >
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-sm text-lg",
              toneStyles[toast.tone].soft,
            )}
            aria-hidden
          >
            {toast.glyph ?? "✨"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="t-body-sm font-semibold text-content">{toast.title}</p>
            {toast.description ? (
              <p className="t-caption mt-0.5 text-content-secondary">{toast.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label={t("common.dismissNotification")}
            className="shrink-0 rounded-xs p-1 text-content-tertiary hover:bg-surface-muted hover:text-content"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
