"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/provider";
import { useAppStore } from "@/store/app-store";
import { useUnreadCount } from "@/hooks/use-notifications";
import { adminNav, isNavActive, parentMobileNav, parentNav } from "@/config/navigation";
import { Drawer } from "@/components/ui/overlay";
import { CountBadge } from "@/components/ui/badge";
import { Sidebar, SidebarNav } from "./sidebar";
import { BrandMark } from "./brand-mark";
import { Header } from "./header";
import { OfflineBanner } from "./offline-banner";

export function AppShell({
  variant = "parent",
  headerSlot,
  children,
  /** Adds the mobile bottom bar. Admin keeps the drawer only — its IA is too deep. */
  mobileBar = true,
}: {
  variant?: "parent" | "admin";
  headerSlot?: ReactNode;
  children: ReactNode;
  mobileBar?: boolean;
}) {
  // Navigation is resolved inside the client boundary. Passing it in from a
  // server layout would mean serialising the icon components, which React
  // rejects — and it keeps the route layouts to a single line.
  const nav = variant === "admin" ? adminNav : parentNav;
  const pathname = usePathname();
  const mobileOpen = useAppStore((s) => s.mobileNavOpen);
  const setMobileOpen = useAppStore((s) => s.setMobileNavOpen);

  // A route change should always close the drawer, however it was triggered.
  useEffect(() => setMobileOpen(false), [pathname, setMobileOpen]);

  return (
    <div className={cn("flex min-h-dvh bg-background", variant === "admin" && "shell-admin")}>
      <Sidebar groups={nav} variant={variant} />

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} side="left" className="bg-sidebar">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <BrandMark variant={variant} />
        </div>
        <SidebarNav groups={nav} collapsed={false} onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMobileNav={() => setMobileOpen(true)}>{headerSlot}</Header>
        <OfflineBanner />
        <main
          id="main"
          className={cn("flex-1 px-4 py-6 sm:px-6 lg:px-8", mobileBar && "pb-24 lg:pb-8")}
        >
          {children}
        </main>
        {mobileBar ? <MobileTabBar /> : null}
      </div>
    </div>
  );
}

/** Bottom navigation for parents on phones — thumb-reachable, five items max. */
function MobileTabBar() {
  const pathname = usePathname();
  const t = useT();
  const unread = useUnreadCount();

  return (
    <nav
      aria-label={t("common.mainNavigation")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {parentMobileNav.map((item) => {
          const active = isNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-semibold transition-colors",
                  active ? "text-primary" : "text-content-tertiary",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-14 place-items-center rounded-full transition-colors",
                    active && "bg-primary-soft",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="max-w-full truncate px-1">{t(item.labelKey)}</span>
                {item.href === "/notifications" && unread > 0 ? (
                  <span className="absolute right-4 top-1">
                    <CountBadge count={unread} className="h-4 min-w-4 px-1 text-[0.625rem]" />
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Standard page heading used at the top of every parent/admin route. */
export function PageHeading({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="t-h1 text-content">{title}</h1>
        {subtitle ? <p className="t-body mt-1 text-content-secondary">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
