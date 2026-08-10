"use client";

import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/provider";
import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * Connection banner. Reappearing online shows a short confirmation rather than
 * silently vanishing, so the state change is legible.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const t = useT();
  const [showRecovered, setShowRecovered] = useState(false);

  useEffect(() => {
    if (online) return;
    // When we go offline, arm the "back online" confirmation for the recovery.
    return () => setShowRecovered(true);
  }, [online]);

  useEffect(() => {
    if (!showRecovered) return;
    const timer = window.setTimeout(() => setShowRecovered(false), 3500);
    return () => window.clearTimeout(timer);
  }, [showRecovered]);

  if (online && !showRecovered) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold",
        online ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
      )}
    >
      {online ? <Wifi className="h-4 w-4" aria-hidden /> : <CloudOff className="h-4 w-4" aria-hidden />}
      {online ? (
        t("pwa.backOnline")
      ) : (
        <>
          <span>{t("pwa.offlineTitle")}.</span>
          <span className="hidden font-medium opacity-90 sm:inline">{t("pwa.offlineBody")}</span>
        </>
      )}
    </div>
  );
}
