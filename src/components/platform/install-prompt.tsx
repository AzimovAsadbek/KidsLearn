"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useT } from "@/i18n/provider";
import { BrandGlyph } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "kl-install-dismissed";

/**
 * PWA install card. It only appears once the browser signals installability and
 * the family hasn't dismissed it — never as an unprompted interstitial.
 */
export function InstallPrompt() {
  const t = useT();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-xl border border-border bg-surface p-4 shadow-pop animate-rise sm:left-auto sm:right-6">
      <div className="flex items-start gap-3">
        <BrandGlyph size={44} />
        <div className="min-w-0 flex-1">
          <p className="t-h4 text-content">{t("pwa.installTitle")}</p>
          <p className="t-caption mt-1 text-content-secondary">{t("pwa.installBody")}</p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              leadingIcon={<Download className="h-4 w-4" />}
              onClick={async () => {
                await deferred?.prompt();
                setVisible(false);
              }}
            >
              {t("pwa.install")}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              {t("pwa.notNow")}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("common.close")}
          className="shrink-0 rounded-xs p-1 text-content-tertiary hover:bg-surface-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
