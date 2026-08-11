"use client";

import Link from "next/link";
import { useT } from "@/i18n/provider";
import { LanguageMenu, ThemeToggle } from "@/components/layout/header";

/** Language + theme controls in the marketing header. */
export function LandingControls() {
  const t = useT();
  return (
    <div className="flex items-center gap-1">
      <LanguageMenu />
      <ThemeToggle />
      <Link
        href="/login"
        className="ml-2 hidden h-10 items-center rounded-sm border border-border bg-surface px-4 text-sm font-semibold text-content shadow-soft transition-colors hover:bg-surface-muted sm:inline-flex"
      >
        {t("auth.signIn")}
      </Link>
    </div>
  );
}
