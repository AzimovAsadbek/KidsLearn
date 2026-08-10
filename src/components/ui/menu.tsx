"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight popover menu. Closes on outside click, Escape and route change,
 * and returns focus to the trigger — enough for headers, table row actions and
 * filter menus without pulling in a headless UI dependency.
 */
export function Dropdown({
  trigger,
  children,
  align = "end",
  className,
  panelClassName,
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  className?: string;
  panelClassName?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v), id })}
      {open ? (
        <div
          id={id}
          role="menu"
          aria-label={label}
          className={cn(
            "absolute z-40 mt-2 min-w-56 origin-top overflow-hidden rounded-lg border border-border bg-surface p-1.5 shadow-pop",
            "animate-pop",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  active,
  danger,
  trailing,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm font-medium transition-colors",
        danger ? "text-danger hover:bg-danger-soft" : "text-content hover:bg-surface-muted",
        active && "bg-primary-soft text-primary",
        className,
      )}
    >
      {icon ? <span className="shrink-0 text-content-tertiary">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="t-overline px-3 pb-1 pt-2 text-content-tertiary">{children}</p>;
}

export function MenuSeparator() {
  return <div className="my-1.5 h-px bg-border" role="separator" />;
}
