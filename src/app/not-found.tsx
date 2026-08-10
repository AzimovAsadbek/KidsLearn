import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { Mascot } from "@/components/kid/mascot";

/** 404 — friendly, on-brand, and it always offers a way back. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex h-20 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <BrandMark href="/" />
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-lg text-center">
          <Mascot size={170} mood="oops" className="mx-auto" />
          <p className="t-display mt-2 text-primary">404</p>
          <h1 className="t-h1 mt-2 text-balance text-content">Oops! We couldn&apos;t find that page</h1>
          <p className="t-body mt-2 text-balance text-content-secondary">
            The page may have moved, or the link might be out of date.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center rounded-md bg-primary px-6 text-[0.9375rem] font-semibold text-primary-on shadow-card transition-colors hover:bg-primary-hover"
            >
              Go home
            </Link>
            <Link
              href="/kids"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-surface px-6 text-[0.9375rem] font-semibold text-content shadow-soft transition-colors hover:bg-surface-muted"
            >
              <span aria-hidden>🎈</span>
              Kid mode
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
