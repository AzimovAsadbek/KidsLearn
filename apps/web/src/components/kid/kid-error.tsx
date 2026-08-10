"use client";

import Link from "next/link";
import { Mascot } from "./mascot";
import { Button } from "@/components/ui/button";

/**
 * Child-facing error. No error codes, no jargon — one big button that retries
 * and one that always gets them home.
 */
export function KidRouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center" role="alert">
      <Mascot size={150} mood="oops" />
      <h1 className="font-display text-2xl font-extrabold text-content">Oops! Something broke</h1>
      <p className="t-body font-semibold text-content-secondary">Let&apos;s try that again.</p>

      <div className="mt-3 flex flex-wrap justify-center gap-3">
        <Button size="xl" variant="kid" onClick={reset}>
          🔁 Try again
        </Button>
        <Link
          href="/kids"
          className="tactile inline-flex h-14 items-center rounded-lg border-2 border-border bg-surface px-6 font-extrabold text-content shadow-soft"
        >
          🏠 Home
        </Link>
      </div>
    </div>
  );
}
