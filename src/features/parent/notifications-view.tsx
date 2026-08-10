"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, CheckCheck, Trash2 } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { NotificationCategory } from "@/types";
import { useAppStore, useUnreadCount } from "@/store/app-store";
import { NOW } from "@/data/children";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Switch } from "@/components/ui/field";

type Filter = "all" | "unread" | NotificationCategory;

export function NotificationsView() {
  const t = useT();
  const { intlLocale } = useI18n();
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAll = useAppStore((s) => s.markAllNotificationsRead);
  const remove = useAppStore((s) => s.removeNotification);
  const unread = useUnreadCount();
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.category === filter);
  }, [notifications, filter]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeading
        title={t("nav.notifications")}
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up."}
        actions={
          unread > 0 ? (
            <Button variant="secondary" leadingIcon={<CheckCheck className="h-4 w-4" />} onClick={markAll}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <Tabs
        variant="pill"
        ariaLabel="Notification filters"
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "All", count: notifications.length },
          { id: "unread", label: "Unread", count: unread },
          { id: "achievement", label: "Achievements" },
          { id: "content", label: "New content" },
          { id: "reminder", label: "Reminders" },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState
          glyph="🔔"
          title={filter === "unread" ? "Nothing unread" : t("state.emptyTitle")}
          body={
            filter === "unread"
              ? "Every notification has been read. We'll let you know when something new happens."
              : t("state.emptyBody")
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {shown.map((notification) => (
            <li key={notification.id}>
              <div
                className={cn(
                  "group flex gap-4 rounded-xl border bg-surface p-4 shadow-soft transition-colors",
                  notification.read ? "border-border" : "border-primary/30 bg-primary-soft/40",
                )}
              >
                <span
                  className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-md text-xl", toneStyles[notification.tone].soft)}
                  aria-hidden
                >
                  {notification.glyph}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="t-h4 text-content">
                      {notification.title}
                      {!notification.read ? (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" aria-label="Unread" />
                      ) : null}
                    </p>
                    <span className="t-caption shrink-0 text-content-tertiary">
                      {formatRelativeTime(notification.at, NOW, intlLocale)}
                    </span>
                  </div>
                  <p className="t-body-sm mt-1 text-content-secondary">{notification.body}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {notification.href ? (
                      <Link
                        href={notification.href}
                        onClick={() => markRead(notification.id)}
                        className="t-label rounded-sm bg-surface-muted px-3 py-1.5 text-content hover:bg-border"
                      >
                        Open
                      </Link>
                    ) : null}
                    {!notification.read ? (
                      <button
                        type="button"
                        onClick={() => markRead(notification.id)}
                        className="t-label rounded-sm px-3 py-1.5 text-primary hover:bg-primary-soft"
                      >
                        Mark as read
                      </button>
                    ) : null}
                  </div>
                </div>

                <IconButton
                  label={`Remove: ${notification.title}`}
                  size="icon-sm"
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => remove(notification.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PushPermissionCard />
    </div>
  );
}

/** The push opt-in, shown as a card rather than a browser-blocking prompt. */
export function PushPermissionCard() {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const [preferences, setPreferences] = useState({ content: true, rewards: true, reminders: false });
  const [granted, setGranted] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" aria-hidden />
            {t("push.title")}
          </span>
        }
        subtitle={t("push.body")}
      />
      <CardBody className="space-y-4">
        <div className="space-y-3 rounded-lg bg-surface-muted p-4">
          <Switch
            label={t("push.reason1")}
            checked={preferences.content}
            onChange={(v) => setPreferences((p) => ({ ...p, content: v }))}
          />
          <Switch
            label={t("push.reason2")}
            checked={preferences.rewards}
            onChange={(v) => setPreferences((p) => ({ ...p, rewards: v }))}
          />
          <Switch
            label={t("push.reason3")}
            checked={preferences.reminders}
            onChange={(v) => setPreferences((p) => ({ ...p, reminders: v }))}
          />
        </div>

        <Button
          disabled={granted}
          onClick={async () => {
            // Ask the browser only after the family has chosen what they want.
            if (typeof Notification !== "undefined" && Notification.permission === "default") {
              await Notification.requestPermission().catch(() => undefined);
            }
            setGranted(true);
            pushToast({ title: "Notifications enabled", tone: "mint", glyph: "🔔" });
          }}
        >
          {granted ? "Notifications enabled" : t("push.enable")}
        </Button>
      </CardBody>
    </Card>
  );
}
