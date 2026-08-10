"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

/**
 * Roving-tabindex tab list. Arrow keys move between tabs, matching the WAI-ARIA
 * pattern so keyboard users don't have to tab through every option.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = "underline",
  className,
  ariaLabel,
}: {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  variant?: "underline" | "pill" | "segmented";
  className?: string;
  ariaLabel?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: React.KeyboardEvent) {
    const index = items.findIndex((item) => item.id === value);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;

    event.preventDefault();
    onChange(items[next].id);
    listRef.current?.querySelectorAll<HTMLElement>("[role=tab]")[next]?.focus();
  }

  if (variant === "segmented") {
    return (
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className={cn("inline-flex rounded-sm bg-surface-muted p-1", className)}
      >
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xs px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-all duration-200",
                active
                  ? "bg-surface text-content shadow-soft"
                  : "text-content-secondary hover:text-content",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className={cn("no-scrollbar flex gap-2 overflow-x-auto", className)}
      >
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200",
                active
                  ? "border-primary bg-primary text-primary-on shadow-soft"
                  : "border-border bg-surface text-content-secondary hover:border-border-strong hover:text-content",
              )}
            >
              {item.icon}
              {item.label}
              {typeof item.count === "number" ? (
                <span className={cn("t-caption font-bold", active ? "opacity-80" : "text-content-tertiary")}>
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn("no-scrollbar flex gap-1 overflow-x-auto border-b border-border", className)}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative shrink-0 px-4 py-3 text-sm font-semibold transition-colors duration-200",
              active ? "text-primary" : "text-content-secondary hover:text-content",
            )}
          >
            <span className="inline-flex items-center gap-2">
              {item.icon}
              {item.label}
              {typeof item.count === "number" ? (
                <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[0.6875rem] font-bold text-content-secondary">
                  {item.count}
                </span>
              ) : null}
            </span>
            {active ? (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ children, id }: { children: ReactNode; id: string }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} className="animate-fade-in">
      {children}
    </div>
  );
}
