import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { Mascot } from "@/components/kid/mascot";

export const metadata: Metadata = { title: "You're offline" };

/**
 * The service worker serves this when a navigation fails. It is deliberately
 * static and dependency-free so it renders from cache without any data.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex h-20 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <BrandMark href="/" />
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-lg text-center">
          <Mascot size={160} mood="sleepy" />
          <h1 className="t-h1 mt-4 text-content">You&apos;re offline</h1>
          <p className="t-body mt-2 text-balance text-content-secondary">
            Downloaded lessons are still available. We&apos;ll reconnect as soon as there&apos;s a signal.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/kids"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-[0.9375rem] font-semibold text-primary-on shadow-card"
            >
              <span aria-hidden>📚</span>
              Open saved lessons
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center rounded-md border border-border bg-surface px-6 text-[0.9375rem] font-semibold text-content shadow-soft"
            >
              Try again
            </Link>
          </div>

          <p className="t-caption mt-8 text-content-tertiary">
            Progress earned offline syncs automatically once you&apos;re back.
          </p>
        </div>
      </main>
    </div>
  );
}
