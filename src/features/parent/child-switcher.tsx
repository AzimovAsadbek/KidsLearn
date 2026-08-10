"use client";

import Link from "next/link";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn, calculateAge } from "@/lib/utils";
import { useT } from "@/i18n/provider";
import { useAppStore } from "@/store/app-store";
import { children, NOW } from "@/data/children";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, MenuLabel, MenuSeparator } from "@/components/ui/menu";

/**
 * The selected child is global state: every parent screen reads from it, so the
 * switcher lives in the header and never has to be repeated per page.
 */
export function HeaderChildSwitcher() {
  const t = useT();
  const selectedId = useAppStore((s) => s.selectedChildId);
  const select = useAppStore((s) => s.selectChild);
  const active = children.find((c) => c.id === selectedId) ?? children[0];

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
          <Avatar spec={active.avatar} size="sm" />
          <span className="min-w-0 text-left">
            <span className="t-label block truncate text-content">{active.name}</span>
            <span className="t-caption block text-content-tertiary">
              {calculateAge(active.birthDate, NOW)} yrs · Lv {active.level}
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
                select(child.id);
                close();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left transition-colors",
                child.id === selectedId ? "bg-primary-soft" : "hover:bg-surface-muted",
              )}
            >
              <Avatar spec={child.avatar} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="t-body-sm block truncate font-semibold text-content">{child.name}</span>
                <span className="t-caption block text-content-secondary">
                  {calculateAge(child.birthDate, NOW)} yrs · ⭐ {child.stars} · 🔥 {child.streakDays}
                </span>
              </span>
              {child.id === selectedId ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
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

/**
 * The dashboard's "Family overview" rail — a horizontal set of child chips with
 * an add affordance, mirroring the reference layout.
 */
export function FamilyOverview() {
  const t = useT();
  const selectedId = useAppStore((s) => s.selectedChildId);
  const select = useAppStore((s) => s.selectChild);

  return (
    <div className="min-w-0">
      <p className="t-label mb-2 text-content-secondary">{t("parent.familyOverview")}</p>
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
        {children.map((child) => {
          const active = child.id === selectedId;
          return (
            <button
              key={child.id}
              type="button"
              onClick={() => select(child.id)}
              aria-pressed={active}
              className={cn(
                "tactile flex shrink-0 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 transition-colors",
                active
                  ? "border-primary bg-primary-soft shadow-soft"
                  : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <Avatar spec={child.avatar} size="sm" ring={active} />
              <span className="text-left">
                <span className="t-label block text-content">{child.name}</span>
                <span className="t-caption block text-content-tertiary">
                  {calculateAge(child.birthDate, NOW)} yrs
                </span>
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
