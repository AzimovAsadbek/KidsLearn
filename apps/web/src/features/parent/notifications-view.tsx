"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCheck, Trash2 } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import { NotificationType } from "@kidslearn/types";
import { useNotifications } from "@/hooks/use-notifications";
import { useAppStore } from "@/store/app-store";
import {
  fetchParentSettings,
  fetchPushStatus,
  queryKeys,
  subscribePush,
  unsubscribePush,
  updateParentSettings,
} from "@/lib/api/queries";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Switch } from "@/components/ui/field";

type Filter = "all" | "unread" | "achievements" | "content" | "reminders";

/** Which API notification types each human-facing tab collects. */
const FILTER_TYPES: Record<Exclude<Filter, "all" | "unread">, NotificationType[]> = {
  achievements: [NotificationType.ACHIEVEMENT_EARNED, NotificationType.REWARD_EARNED, NotificationType.STREAK],
  content: [NotificationType.NEW_LESSON],
  reminders: [NotificationType.LESSON_REMINDER],
};

export function NotificationsView() {
  const t = useT();
  const { intlLocale, plural } = useI18n();
  const { notifications, unread, markRead, markAll, remove, isLoading } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.read);
    const types = FILTER_TYPES[filter];
    return notifications.filter((n) => types.includes(n.type));
  }, [notifications, filter]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeading
        title={t("nav.notifications")}
        subtitle={unread > 0 ? plural("plural.unread", unread) : t("notif.allCaughtUp")}
        actions={
          unread > 0 ? (
            <Button variant="secondary" leadingIcon={<CheckCheck className="h-4 w-4" />} onClick={markAll}>
              {t("notif.markAllRead")}
            </Button>
          ) : undefined
        }
      />

      <Tabs
        variant="pill"
        ariaLabel={t("notif.filters")}
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: t("common.all"), count: notifications.length },
          { id: "unread", label: t("notif.tabUnread"), count: unread },
          { id: "achievements", label: t("notif.tabAchievements") },
          { id: "content", label: t("notif.tabContent") },
          { id: "reminders", label: t("notif.tabReminders") },
        ]}
      />

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-24 rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          glyph="🔔"
          title={filter === "unread" ? t("notif.emptyUnreadTitle") : t("state.emptyTitle")}
          body={filter === "unread" ? t("notif.emptyUnreadBody") : t("state.emptyBody")}
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
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-md text-xl",
                    (toneStyles[notification.tone as keyof typeof toneStyles] ?? toneStyles.brand).soft,
                  )}
                  aria-hidden
                >
                  {notification.glyph}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="t-h4 text-content">
                      {notification.title}
                      {!notification.read ? (
                        <span
                          className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle"
                          aria-label={t("notif.unread")}
                        />
                      ) : null}
                    </p>
                    <span className="t-caption shrink-0 text-content-tertiary">
                      {formatRelativeTime(notification.createdAt, new Date(), intlLocale)}
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
                        {t("common.open")}
                      </Link>
                    ) : null}
                    {!notification.read ? (
                      <button
                        type="button"
                        onClick={() => markRead(notification.id)}
                        className="t-label rounded-sm px-3 py-1.5 text-primary hover:bg-primary-soft"
                      >
                        {t("notif.markRead")}
                      </button>
                    ) : null}
                  </div>
                </div>

                <IconButton
                  label={`${t("common.remove")}: ${notification.title}`}
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

/** Converts a base64url VAPID key into the byte array PushManager expects. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

/**
 * Real push opt-in backed by the Push API. The reminder/report switches persist
 * to the parent's settings; the subscribe button registers this browser with
 * the server. When the server has no VAPID keys the card says so instead of
 * pretending.
 */
export function PushPermissionCard() {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const status = useQuery({ queryKey: queryKeys.pushStatus, queryFn: fetchPushStatus });
  const settings = useQuery({ queryKey: queryKeys.parentSettings, queryFn: fetchParentSettings });

  const saveSettings = useMutation({
    mutationFn: updateParentSettings,
    onSuccess: (data) => queryClient.setQueryData(queryKeys.parentSettings, data),
    onError: () => pushToast({ title: t("state.errorTitle"), tone: "coral", glyph: "⚠️" }),
  });

  async function enablePush() {
    const publicKey = status.data?.publicKey;
    if (!publicKey) return;
    setBusy(true);
    try {
      if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
        pushToast({ title: t("push.unsupported"), tone: "coral", glyph: "🚫" });
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        pushToast({ title: t("push.denied"), tone: "coral", glyph: "🔕" });
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
      await subscribePush(subscription.toJSON());
      await queryClient.invalidateQueries({ queryKey: queryKeys.pushStatus });
      pushToast({ title: t("push.enabled"), tone: "mint", glyph: "🔔" });
    } catch {
      pushToast({ title: t("state.errorTitle"), tone: "coral", glyph: "⚠️" });
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.pushStatus });
      pushToast({ title: t("push.disabled"), tone: "sky", glyph: "🔕" });
    } catch {
      pushToast({ title: t("state.errorTitle"), tone: "coral", glyph: "⚠️" });
    } finally {
      setBusy(false);
    }
  }

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
            label={t("push.dailyReminder")}
            checked={settings.data?.reminderEnabled ?? false}
            disabled={settings.isLoading || saveSettings.isPending}
            onChange={(v) => saveSettings.mutate({ reminderEnabled: v })}
          />
          <Switch
            label={t("push.weeklyReport")}
            checked={settings.data?.weeklyReportEnabled ?? false}
            disabled={settings.isLoading || saveSettings.isPending}
            onChange={(v) => saveSettings.mutate({ weeklyReportEnabled: v })}
          />
        </div>

        {status.data?.configured === false ? (
          <p className="t-body-sm rounded-lg border border-dashed border-border-strong bg-surface-muted p-3 text-content-secondary">
            {t("push.notConfigured")}
          </p>
        ) : status.data?.subscribed ? (
          <Button variant="secondary" onClick={() => void disablePush()} loading={busy}>
            {t("push.disable")}
          </Button>
        ) : (
          <Button onClick={() => void enablePush()} loading={busy} disabled={status.isLoading}>
            {t("push.enable")}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
