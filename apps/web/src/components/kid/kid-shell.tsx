"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LogOut, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import { useAppStore } from "@/store/app-store";
import { useChildContext } from "@/components/providers/child-provider";
import { verifyParentPin } from "@/lib/api/queries";
import { kidBottomNav, isNavActive } from "@/config/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { KidLoading } from "./kid-loading";

/**
 * The child shell is deliberately *not* a dashboard: no sidebar, no search, no
 * dense header. Five destinations, giant targets, and one exit that only an
 * adult can pass.
 */
export function KidShell({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const { selectedChild, loading } = useChildContext();
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const toggleSound = useAppStore((s) => s.toggleSound);
  const [exitOpen, setExitOpen] = useState(false);

  // A full-screen player (lesson or game) hides the chrome so nothing competes
  // with the activity itself.
  const immersive = /\/kids\/(lessons|games)\/[^/]+$/.test(pathname);

  if (immersive) {
    return (
      <div className="canvas-kid min-h-dvh">
        <OfflineBanner />
        <main id="main">{children}</main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="canvas-kid min-h-dvh">
        <KidLoading />
      </div>
    );
  }

  // A family with no learner profiles yet: say so instead of spinning forever.
  if (!selectedChild) {
    return (
      <div className="canvas-kid grid min-h-dvh place-items-center px-4">
        <div className="max-w-sm rounded-3xl border-2 border-border bg-surface p-8 text-center shadow-card">
          <span className="text-6xl" aria-hidden>
            👶
          </span>
          <h1 className="font-display mt-4 text-2xl font-extrabold text-content">{t("kid.noProfilesTitle")}</h1>
          <p className="t-body-sm mt-2 font-semibold text-content-secondary">{t("kid.noProfilesBody")}</p>
          <Link
            href="/dashboard"
            className="tactile mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 font-extrabold text-primary-on"
          >
            {t("kid.goToParent")}
          </Link>
        </div>
      </div>
    );
  }

  const avatarTone = (selectedChild.avatarTone in toneStyles ? selectedChild.avatarTone : "brand") as keyof typeof toneStyles;

  return (
    <div className="canvas-kid flex min-h-dvh flex-col">
      <OfflineBanner />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-surface/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          {/* min-h-11 keeps this at the 44px touch target every child-facing
              control in the app meets. */}
          <Link href="/kids/profile" className="flex min-h-11 items-center gap-2.5 rounded-full pr-2">
            <Avatar spec={{ glyph: selectedChild.avatarGlyph, tone: avatarTone }} size="sm" ring />
            <span className="font-display text-base font-extrabold text-content">{selectedChild.name}</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1.5 dark:bg-sun-core/20">
              <span aria-hidden>⭐</span>
              <span className="t-label text-sun-deep tabular-nums dark:text-sun-core">
                {selectedChild.progress?.stars ?? 0}
              </span>
            </span>

            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundEnabled ? t("kid.soundOff") : t("kid.soundOn")}
              aria-pressed={soundEnabled}
              className="grid h-10 w-10 place-items-center rounded-full bg-surface text-content-secondary shadow-soft transition-colors hover:text-content"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => setExitOpen(true)}
              aria-label={t("nav.exitKidMode")}
              className="grid h-10 w-10 place-items-center rounded-full bg-surface text-content-secondary shadow-soft transition-colors hover:text-content"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-5 sm:px-6">
        {children}
      </main>

      <KidTabBar />
      <ParentGate open={exitOpen} onClose={() => setExitOpen(false)} />
    </div>
  );
}

function KidTabBar() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav
      aria-label={t("nav.kidNavigation")}
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 rounded-3xl border-2 border-border bg-surface/95 p-2 shadow-pop backdrop-blur">
        {kidBottomNav.map((item) => {
          const active = isNavActive(pathname, { href: item.href, exact: item.href === "/kids" });
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 rounded-2xl py-2 transition-all duration-200",
                  active ? cn(toneStyles[item.tone].soft, "scale-105") : "hover:bg-surface-muted",
                )}
              >
                <span className={cn("text-2xl transition-transform", active && "scale-110")} aria-hidden>
                  {item.glyph}
                </span>
                <span
                  className={cn(
                    "text-[0.625rem] font-bold leading-tight",
                    active ? toneStyles[item.tone].ink : "text-content-tertiary",
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Grown-up gate. The PIN is verified by the API against the parent account.
 * When no PIN has been set yet the gate says so and lets the adult through —
 * pretending an unset PIN protects anything would be worse than being honest.
 */
function ParentGate({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);

  async function submit() {
    if (checking) return;
    setChecking(true);
    try {
      const result = await verifyParentPin(pin);
      if (!result.configured) {
        setUnconfigured(true);
        return;
      }
      if (result.valid) {
        onClose();
        setPin("");
        router.push("/dashboard");
        return;
      }
      setError(true);
      setPin("");
    } catch {
      setError(true);
    } finally {
      setChecking(false);
    }
  }

  function leave(target: string) {
    onClose();
    setPin("");
    setUnconfigured(false);
    router.push(target);
  }

  return (
    <Modal open={open} onClose={onClose} title={t("auth.pinTitle")} description={t("auth.pinSubtitle")} size="sm">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-4xl" aria-hidden>
          🔒
        </div>

        {unconfigured ? (
          <div className="mt-5">
            <p className="t-body-sm font-semibold text-content">{t("auth.pinNotSetTitle")}</p>
            <p className="t-caption mt-1 text-content-secondary">{t("auth.pinNotSetBody")}</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button fullWidth onClick={() => leave("/dashboard")}>
                {t("auth.pinGoDashboard")}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" fullWidth onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button variant="secondary" fullWidth onClick={() => leave("/settings")}>
                  {t("auth.pinGoSetUp")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 flex justify-center gap-2" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-12 w-10 rounded-lg border-2 text-2xl font-bold leading-[2.75rem]",
                    pin.length > i ? "border-primary bg-primary-soft text-primary" : "border-border",
                  )}
                >
                  {pin.length > i ? "•" : ""}
                </span>
              ))}
            </div>

            <label className="sr-only" htmlFor="parent-pin">
              {t("auth.pinTitle")}
            </label>
            <input
              id="parent-pin"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              autoComplete="off"
              onChange={(e) => {
                setError(false);
                setPin(e.target.value.replace(/\D/g, ""));
              }}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              className="mt-4 h-11 w-40 rounded-sm border border-border bg-surface text-center text-lg tracking-[0.5em] text-content"
            />

            {error ? (
              <p role="alert" className="t-body-sm mt-3 font-semibold text-danger">
                {t("auth.pinError")}
              </p>
            ) : null}

            <div className="mt-5 flex gap-2">
              <Button variant="ghost" fullWidth onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button fullWidth onClick={() => void submit()} disabled={pin.length < 4} loading={checking}>
                {t("common.continue")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
