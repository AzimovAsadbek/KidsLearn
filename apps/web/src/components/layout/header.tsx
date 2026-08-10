"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Globe, LogOut, Menu, Monitor, Moon, Search, Settings, Sun, User } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import { LOCALES } from "@/i18n/config";
import { useTheme } from "@/components/providers/theme-provider";
import { useAppStore, useUnreadCount } from "@/store/app-store";
import { Dropdown, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { IconButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { CountBadge } from "@/components/ui/badge";
import { NOW, parent } from "@/data/children";
import { CommandSearch } from "./command-search";

export function Header({
  children,
  onOpenMobileNav,
  className,
  sticky = true,
}: {
  /** Left slot — page title, child switcher, or breadcrumbs. */
  children?: ReactNode;
  onOpenMobileNav?: () => void;
  className?: string;
  sticky?: boolean;
}) {
  const t = useT();
  const [searchOpen, setSearchOpen] = useState(false);

  // The "/" shortcut is published by CommandSearch and consumed here, so the
  // open state stays owned by the header.
  useEffect(() => {
    const open = () => setSearchOpen(true);
    window.addEventListener("kl:open-search", open);
    return () => window.removeEventListener("kl:open-search", open);
  }, []);

  return (
    <>
      <header
        className={cn(
          "z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md sm:px-6",
          sticky && "sticky top-0",
          className,
        )}
      >
        <IconButton
          label={t("common.openMenu")}
          className="lg:hidden"
          size="icon-sm"
          onClick={onOpenMobileNav}
        >
          <Menu className="h-5 w-5" />
        </IconButton>

        <div className="min-w-0 flex-1">{children}</div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-10 items-center gap-2 rounded-sm border border-border bg-surface-muted px-3 text-sm text-content-tertiary transition-colors hover:border-border-strong md:flex"
          >
            <Search className="h-4 w-4" />
            <span className="pr-6">{t("common.search")}</span>
            <kbd className="rounded-[0.3rem] border border-border bg-surface px-1.5 py-0.5 text-[0.6875rem] font-semibold">
              /
            </kbd>
          </button>
          <IconButton label={t("common.search")} size="icon-sm" className="md:hidden" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </IconButton>

          <NotificationsMenu />
          <LanguageMenu />
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </header>

      <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

export function ThemeToggle() {
  const { preference, resolved, setPreference } = useTheme();
  const t = useT();

  const options = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <Dropdown
      label={t("common.theme")}
      trigger={({ toggle, open }) => (
        <IconButton label={t("common.theme")} size="icon-sm" onClick={toggle} aria-expanded={open}>
          {resolved === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </IconButton>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>{t("common.theme")}</MenuLabel>
          {options.map((option) => (
            <MenuItem
              key={option.id}
              icon={<option.icon className="h-4 w-4" />}
              active={preference === option.id}
              trailing={preference === option.id ? <Check className="h-4 w-4 text-primary" /> : undefined}
              onClick={() => {
                setPreference(option.id);
                close();
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}

export function LanguageMenu() {
  const { locale, setLocale } = useI18n();
  const t = useT();

  return (
    <Dropdown
      label={t("common.language")}
      trigger={({ toggle, open }) => (
        <IconButton label={t("common.language")} size="icon-sm" onClick={toggle} aria-expanded={open}>
          <Globe className="h-5 w-5" />
        </IconButton>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>{t("common.language")}</MenuLabel>
          {LOCALES.map((option) => (
            <MenuItem
              key={option.code}
              icon={<span aria-hidden>{option.flag}</span>}
              active={locale === option.code}
              trailing={locale === option.code ? <Check className="h-4 w-4 text-primary" /> : undefined}
              onClick={() => {
                setLocale(option.code);
                close();
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}

export function NotificationsMenu() {
  const t = useT();
  const { intlLocale } = useI18n();
  const notifications = useAppStore((s) => s.notifications);
  const markAll = useAppStore((s) => s.markAllNotificationsRead);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const unread = useUnreadCount();

  return (
    <Dropdown
      label={t("common.notifications")}
      panelClassName="w-[min(24rem,calc(100vw-2rem))] p-0"
      trigger={({ toggle, open }) => (
        <IconButton
          label={`${t("common.notifications")}${unread ? ` (${unread})` : ""}`}
          size="icon-sm"
          onClick={toggle}
          aria-expanded={open}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1">
              <CountBadge count={unread} className="h-4 min-w-4 px-1 text-[0.625rem]" />
            </span>
          ) : null}
        </IconButton>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="t-h4 text-content">{t("common.notifications")}</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="t-caption font-semibold text-primary hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="scrollbar-slim max-h-80 overflow-y-auto">
            {notifications.slice(0, 6).map((notification) => (
              <li key={notification.id}>
                <Link
                  href={notification.href ?? "/notifications"}
                  onClick={() => {
                    markRead(notification.id);
                    close();
                  }}
                  className={cn(
                    "flex gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-muted",
                    !notification.read && "bg-primary-soft/40",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-sm text-base",
                      toneStyles[notification.tone].soft,
                    )}
                    aria-hidden
                  >
                    {notification.glyph}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-body-sm block font-semibold text-content">{notification.title}</span>
                    <span className="t-caption mt-0.5 block line-clamp-2 text-content-secondary">
                      {notification.body}
                    </span>
                    <span className="t-caption mt-1 block text-content-tertiary">
                      {formatRelativeTime(notification.at, NOW, intlLocale)}
                    </span>
                  </span>
                  {!notification.read ? (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-border p-2">
            <Link
              href="/notifications"
              onClick={close}
              className="block rounded-sm px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-primary-soft"
            >
              {t("common.viewAll")}
            </Link>
          </div>
        </div>
      )}
    </Dropdown>
  );
}

export function ProfileMenu() {
  const t = useT();
  const router = useRouter();
  return (
    <Dropdown
      label={t("common.profile")}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={t("common.profile")}
          className="ml-1 flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-surface-muted"
        >
          <Avatar spec={parent.avatar} size="sm" />
          <span className="t-label hidden max-w-24 truncate text-content sm:block">{parent.name}</span>
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar spec={parent.avatar} size="md" />
            <div className="min-w-0">
              <p className="t-label truncate text-content">{parent.name}</p>
              <p className="t-caption truncate text-content-secondary">{parent.email}</p>
            </div>
          </div>
          <MenuSeparator />
          <MenuItem
            icon={<User className="h-4 w-4" />}
            onClick={() => {
              router.push("/settings");
              close();
            }}
          >
            {t("common.profile")}
          </MenuItem>
          <MenuItem
            icon={<Settings className="h-4 w-4" />}
            onClick={() => {
              router.push("/settings");
              close();
            }}
          >
            {t("common.settings")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<LogOut className="h-4 w-4" />}
            danger
            onClick={() => {
              router.push("/login");
              close();
            }}
          >
            {t("common.logout")}
          </MenuItem>
        </>
      )}
    </Dropdown>
  );
}
