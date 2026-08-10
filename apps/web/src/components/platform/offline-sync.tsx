"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { flushOfflineAttempts, pendingAttemptCount } from "@/features/games/offline-queue";

/**
 * Drains the offline attempt queue.
 *
 * Runs once on mount and again whenever connectivity returns. Every queued
 * attempt carries an idempotency key, so a partially-succeeded flush can be
 * retried without awarding anything twice.
 */
export function OfflineSync() {
  const queryClient = useQueryClient();
  const pushToast = useAppStore((s) => s.pushToast);

  useEffect(() => {
    let cancelled = false;

    const flush = async () => {
      if (pendingAttemptCount() === 0) return;
      const sent = await flushOfflineAttempts();
      if (cancelled || sent === 0) return;

      await queryClient.invalidateQueries({ queryKey: ["children"] });
      pushToast({
        title: `${sent} game${sent > 1 ? "s" : ""} synced`,
        description: "Stars earned offline have been added.",
        tone: "mint",
        glyph: "☁️",
      });
    };

    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, [queryClient, pushToast]);

  return null;
}
