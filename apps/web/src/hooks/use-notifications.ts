"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationDto } from "@kidslearn/types";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  queryKeys,
} from "@/lib/api/queries";
import { useSession } from "@/components/providers/session-provider";

const LIST_PARAMS = { limit: 50 } as const;

/**
 * One notification feed for the whole shell. Header bell, sidebar badge and
 * the notifications page all read this query, so a "mark read" anywhere
 * updates every badge at once.
 */
export function useNotifications() {
  const { isAuthenticated } = useSession();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.notifications(LIST_PARAMS),
    queryFn: () => fetchNotifications(LIST_PARAMS),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  // Optimistically flip the local copy so the badge reacts instantly; the
  // invalidation afterwards reconciles with the server.
  const mutateLocal = (updater: (items: NotificationDto[]) => NotificationDto[]) => {
    queryClient.setQueryData<{ items: NotificationDto[]; meta: unknown }>(
      queryKeys.notifications(LIST_PARAMS),
      (current) => (current ? { ...current, items: updater(current.items) } : current),
    );
  };

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: (id) => mutateLocal((items) => items.map((n) => (n.id === id ? { ...n, read: true } : n))),
    onSettled: invalidate,
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: () => mutateLocal((items) => items.map((n) => ({ ...n, read: true }))),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onMutate: (id) => mutateLocal((items) => items.filter((n) => n.id !== id)),
    onSettled: invalidate,
  });

  const notifications = query.data?.items ?? [];

  return {
    notifications,
    unread: notifications.reduce((total, n) => total + (n.read ? 0 : 1), 0),
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    markRead: (id: string) => markRead.mutate(id),
    markAll: () => markAll.mutate(),
    remove: (id: string) => remove.mutate(id),
  };
}

/** Badge-only consumers (sidebar, mobile tab bar). */
export function useUnreadCount(): number {
  return useNotifications().unread;
}
