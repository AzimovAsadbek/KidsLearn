"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { LanguageMenu, ThemeToggle } from "@/components/layout/header";

/** Language + theme controls in the marketing header. */
export function LandingControls() {
  return (
    <div className="flex items-center gap-1">
      <LanguageMenu />
      <ThemeToggle />
      <Link
        href="/login"
        className="ml-2 hidden h-10 items-center rounded-sm border border-border bg-surface px-4 text-sm font-semibold text-content shadow-soft transition-colors hover:bg-surface-muted sm:inline-flex"
      >
        Sign in
      </Link>
    </div>
  );
}

export function RoleCard({
  href,
  tone,
  glyph,
  icon,
  title,
  body,
  points,
}: {
  href: string;
  tone: Tone;
  glyph: string;
  icon: ReactNode;
  title: string;
  body: string;
  points: string[];
}) {
  const style = toneStyles[tone];
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-surface p-6 shadow-soft transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-card",
        style.border,
      )}
    >
      <span
        className={cn("grid h-14 w-14 place-items-center rounded-lg text-3xl", style.soft)}
        aria-hidden
      >
        {glyph}
      </span>

      <h3 className="t-h3 mt-4 flex items-center gap-2 text-content">
        <span className={style.ink}>{icon}</span>
        {title}
      </h3>
      <p className="t-body-sm mt-1.5 flex-1 text-content-secondary">{body}</p>

      <ul className="mt-4 space-y-1.5">
        {points.map((point) => (
          <li key={point} className="t-caption flex items-center gap-2 font-medium text-content-secondary">
            <Check className={cn("h-3.5 w-3.5 shrink-0", style.ink)} aria-hidden />
            {point}
          </li>
        ))}
      </ul>

      <span className={cn("t-label mt-5 inline-flex items-center gap-1.5", style.ink)}>
        Continue
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
      </span>
    </Link>
  );
}
