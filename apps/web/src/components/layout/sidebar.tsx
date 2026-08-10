"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, useT } from "@/i18n/provider";
import { useAppStore } from "@/store/app-store";
import { useUnreadCount } from "@/hooks/use-notifications";
import { isNavActive, type NavGroup } from "@/config/navigation";
import { CountBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress";
import { BrandMark } from "./brand-mark";
import { useOptionalChildContext } from "@/components/providers/child-provider";
import { useSession } from "@/components/providers/session-provider";

export function SidebarNav({
  groups,
  collapsed,
  onNavigate,
}: {
  groups: NavGroup[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = useT();
  const { plural } = useI18n();
  const unread = useUnreadCount();

  return (
    <nav className="flex-1 space-y-6 px-3 py-4" aria-label={t("common.mainNavigation")}>
      {groups.map((group, groupIndex) => (
        <div key={group.titleKey ?? groupIndex}>
          {group.titleKey && !collapsed ? (
            <p className="t-overline px-3 pb-2 text-sidebar-section">{t(group.titleKey)}</p>
          ) : null}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isNavActive(pathname, item);
              const Icon = item.icon;
              const label = t(item.labelKey);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors duration-200",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-sidebar-active text-sidebar-fg-active shadow-soft"
                        : "text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg-active",
                    )}
                  >
                    <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" aria-hidden />
                    {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
                    {item.badgeKey === "notifications" && unread > 0 ? (
                      collapsed ? (
                        <span
                          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger"
                          aria-label={plural("plural.unread", unread)}
                        />
                      ) : (
                        <CountBadge count={unread} />
                      )
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Desktop sidebar. Collapsing keeps the icons and hides the labels, which is why
 * every item carries a title attribute in the collapsed state.
 */
export function Sidebar({ groups, variant = "parent" }: { groups: NavGroup[]; variant?: "parent" | "admin" }) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);
  const childCtx = useOptionalChildContext();
  const child = childCtx?.selectedChild ?? null;
  const { user } = useSession();
  const t = useT();

  const goalDone = child?.progress?.todayLessons ?? 0;
  const goalTotal = Math.max(1, child?.dailyGoalLessons ?? 1);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 lg:flex",
        collapsed ? "w-[4.75rem]" : "w-64",
      )}
      data-collapsed={collapsed}
    >
      <div className={cn("flex h-16 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        <BrandMark compact={collapsed} variant={variant} />
      </div>

      <div className="scrollbar-slim flex-1 overflow-y-auto">
        <SidebarNav groups={groups} collapsed={collapsed} />
      </div>

      {/* Contextual footer: goal card for parents, AI shortcut for admins */}
      {!collapsed ? (
        <div className="px-3 pb-3">
          {variant === "parent" && child ? (
            <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white shadow-card">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" aria-hidden />
                <p className="t-label">{t("parent.todaysGoal")}</p>
              </div>
              <p className="t-h2 mt-2 font-extrabold">
                {goalDone}/{goalTotal}
              </p>
              <p className="t-caption opacity-90">{t("parent.lessonsCompleted")}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-700"
                  style={{
                    width: `${Math.min(100, Math.round((goalDone / goalTotal) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ) : variant === "parent" ? null : (
            <Link
              href="/admin/ai-generator"
              className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-hover p-3 text-sidebar-fg transition-colors hover:text-sidebar-fg-active"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-brand-500/20 text-brand-300">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="t-label block truncate">{t("nav.aiGenerator")}</span>
                <span className="t-caption block text-sidebar-section">{t("common.beta")}</span>
              </span>
            </Link>
          )}
        </div>
      ) : null}

      <div className="border-t border-sidebar-border p-3">
        <div className={cn("flex items-center gap-3", collapsed && "flex-col")}>
          <Avatar spec={{ glyph: user?.avatarGlyph || "🙂", tone: "brand" }} size="sm" />
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="t-label truncate text-sidebar-fg-active">{user?.name ?? ""}</p>
              <p className="t-caption truncate text-sidebar-section">
                {t(variant === "admin" ? "nav.admin" : "nav.parent")}
              </p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? t("common.expandSidebar") : t("common.collapseSidebar")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xs text-sidebar-fg transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg-active"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}

/** Progress rail reused by the collapsed sidebar tooltip content. */
export function SidebarGoal({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <div className="w-40">
      <p className="t-caption mb-1 font-semibold">{label}</p>
      <ProgressBar value={(done / total) * 100} size="sm" />
    </div>
  );
}
