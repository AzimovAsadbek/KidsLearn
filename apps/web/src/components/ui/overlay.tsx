"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./button";
import { useT } from "@/i18n/provider";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Shared overlay behaviour for Modal and Drawer: escape to close, scroll lock,
 * focus moved in on open, focus trapped while open, focus restored on close.
 */
function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !ref.current) return;

      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown, true);

    const timer = window.setTimeout(() => {
      const target = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? ref.current)?.focus();
    }, 20);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(timer);
      restoreTo.current?.focus?.();
    };
  }, [open, onKeyDown]);

  return ref;
}

function Portal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
  children: ReactNode;
  /** Suppresses the header close button for flows that must be completed. */
  hideClose?: boolean;
}

const modalSizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export function Modal({ open, onClose, title, description, size = "md", footer, children, hideClose }: ModalProps) {
  const t = useT();
  const ref = useOverlay(open, onClose);
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
        <div
          className="absolute inset-0 bg-overlay backdrop-blur-[2px] animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : undefined}
          tabIndex={-1}
          className={cn(
            "relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop",
            "animate-rise sm:rounded-2xl",
            modalSizes[size],
          )}
        >
          {title || !hideClose ? (
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="min-w-0">
                {title ? <h2 className="t-h2 text-content">{title}</h2> : null}
                {description ? <p className="t-body-sm mt-1 text-content-secondary">{description}</p> : null}
              </div>
              {!hideClose ? (
                <IconButton label={t("common.close")} size="icon-sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </IconButton>
              ) : null}
            </div>
          ) : null}

          <div className="scrollbar-slim flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-surface-muted px-6 py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </Portal>
  );
}

export function Drawer({
  open,
  onClose,
  side = "right",
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const t = useT();
  const ref = useOverlay(open, onClose);
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-overlay animate-fade-in" onClick={onClose} aria-hidden="true" />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : undefined}
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 flex w-[min(22rem,88vw)] flex-col bg-surface shadow-pop",
            side === "right" ? "right-0" : "left-0",
            className,
          )}
          style={{
            animation: `${side === "right" ? "drawer-in-right" : "drawer-in-left"} 0.28s var(--ease-out-soft) both`,
          }}
        >
          {title ? (
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="t-h3 text-content">{title}</h2>
              <IconButton label={t("common.close")} size="icon-sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          ) : null}
          <div className="scrollbar-slim flex-1 overflow-y-auto">{children}</div>
          {footer ? <div className="border-t border-border px-5 py-4">{footer}</div> : null}
        </div>
      </div>
      <style>{`
        @keyframes drawer-in-right { from { transform: translateX(100%); } to { transform: none; } }
        @keyframes drawer-in-left { from { transform: translateX(-100%); } to { transform: none; } }
      `}</style>
    </Portal>
  );
}

/** Destructive-action confirmation with the same overlay semantics. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
}) {
  const t = useT();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-sm border border-border px-4 text-sm font-semibold text-content hover:bg-surface"
          >
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "h-11 rounded-sm px-4 text-sm font-semibold text-white shadow-soft",
              tone === "danger" ? "bg-danger" : "bg-primary",
            )}
          >
            {confirmLabel ?? t("common.confirm")}
          </button>
        </>
      }
    >
      <p className="t-body text-content-secondary">{body}</p>
    </Modal>
  );
}
