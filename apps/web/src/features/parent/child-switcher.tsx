"use client";

import Link from "next/link";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import { useChildContext } from "@/components/providers/child-provider";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/states";

/**
 * The selected child is global context backed by the API, so every parent
 * screen reads the same value and the switcher never has to be repeated.
 */
export function HeaderChildSwitcher() {
  const t = useT();
  const { children, selectedChild, selectChild, loading } = useChildContext();

  if (loading) return <Skeleton className="h-11 w-44 rounded-full" />;

  if (!selectedChild) {
    return (
      <Link
        href="/children?add=1"
        className="t-label inline-flex items-center gap-2 rounded-full border border-dashed border-border-strong px-4 py-2 text-content-secondary hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("parent.addChild")}
      </Link>
    );
  }

  return (
    <Dropdown
      align="start"
      label={t("common.selectChild")}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex max-w-full items-center gap-2.5 rounded-full border border-border bg-surface py-1 pl-1 pr-3 shadow-soft transition-colors hover:bg-surface-muted"
        >
          <Avatar spec={{ glyph: selectedChild.avatarGlyph, tone: selectedChild.avatarTone as Tone }} size="sm" />
          <span className="min-w-0 text-left">
            <span className="t-label block truncate text-content">{selectedChild.name}</span>
            <span className="t-caption block text-content-tertiary">
              {selectedChild.age} yrs · Lv {selectedChild.progress?.level ?? 1}
            </span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-content-tertiary transition-transform", open && "rotate-180")} />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>{t("common.selectChild")}</MenuLabel>
          {children.map((child) => (
            <button
              key={child.id}
              type="button"
              role="menuitem"
              onClick={() => {
                selectChild(child.id);
                close();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left transition-colors",
                child.id === selectedChild.id ? "bg-primary-soft" : "hover:bg-surface-muted",
              )}
            >
              <Avatar spec={{ glyph: child.avatarGlyph, tone: child.avatarTone as Tone }} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="t-body-sm block truncate font-semibold text-content">{child.name}</span>
                <span className="t-caption block text-content-secondary">
                  {child.age} yrs · ⭐ {child.progress?.stars ?? 0} · 🔥 {child.progress?.currentStreak ?? 0}
                </span>
              </span>
              {child.id === selectedChild.id ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
            </button>
          ))}
          <MenuSeparator />
          <Link
            href="/children?add=1"
            onClick={close}
            className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-soft"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t("parent.addChild")}
          </Link>
        </>
      )}
    </Dropdown>
  );
}

/** The dashboard's "Family overview" rail. */
export function FamilyOverview() {
  const t = useT();
  const { children, selectedChild, selectChild, loading } = useChildContext();

  if (loading) {
    return (
      <div className="flex gap-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-32 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="t-label mb-2 text-content-secondary">{t("parent.familyOverview")}</p>
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
        {children.map((child) => {
          const active = child.id === selectedChild?.id;
          return (
            <button
              key={child.id}
              type="button"
              onClick={() => selectChild(child.id)}
              aria-pressed={active}
              className={cn(
                "tactile flex shrink-0 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 transition-colors",
                active
                  ? "border-primary bg-primary-soft shadow-soft"
                  : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <Avatar spec={{ glyph: child.avatarGlyph, tone: child.avatarTone as Tone }} size="sm" ring={active} />
              <span className="text-left">
                <span className="t-label block text-content">{child.name}</span>
                <span className="t-caption block text-content-tertiary">{child.age} yrs</span>
              </span>
            </button>
          );
        })}

        <Link
          href="/children?add=1"
          className="tactile flex shrink-0 items-center gap-2 rounded-full border border-dashed border-border-strong bg-surface px-4 py-1.5 text-content-secondary transition-colors hover:border-primary hover:text-primary"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted">
            <Plus className="h-4 w-4" aria-hidden />
          </span>
          <span className="t-label">{t("parent.addChild")}</span>
        </Link>
      </div>
    </div>
  );
}
