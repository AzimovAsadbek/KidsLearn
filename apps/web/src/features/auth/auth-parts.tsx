"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-7">
      <h1 className="t-h1 text-content">{title}</h1>
      <p className="t-body mt-1.5 text-content-secondary">{subtitle}</p>
    </div>
  );
}

/** Social providers. Presented as a genuine alternative, not decoration. */
export function SocialRow({ label }: { label: string }) {
  const providers = [
    { id: "google", label: "Google", glyph: "G" },
    { id: "apple", label: "Apple", glyph: "" },
    { id: "telegram", label: "Telegram", glyph: "✈" },
  ];

  return (
    <>
      <div className="my-6 flex items-center gap-3" role="separator">
        <span className="h-px flex-1 bg-border" />
        <span className="t-caption text-content-tertiary">{label}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-sm border border-border bg-surface text-sm font-semibold text-content transition-colors hover:bg-surface-muted"
          >
            <span aria-hidden className="text-base leading-none">
              {provider.glyph}
            </span>
            <span className="hidden sm:inline">{provider.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function AuthFooterLink({
  prompt,
  href,
  action,
}: {
  prompt: string;
  href: string;
  action: string;
}) {
  return (
    <p className="t-body-sm mt-7 text-center text-content-secondary">
      {prompt}{" "}
      <Link href={href} className="font-semibold text-primary hover:underline">
        {action}
      </Link>
    </p>
  );
}

/** Password strength meter — four segments, described in words as well as colour. */
export function PasswordStrength({ value }: { value: string }) {
  const score = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;

  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const colours = ["bg-border-strong", "bg-danger", "bg-warning", "bg-info", "bg-success"];

  if (!value) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-colors", i < score ? colours[score] : "bg-border")}
          />
        ))}
      </div>
      <p className="t-caption mt-1 font-semibold text-content-secondary">
        Password strength: <span className="text-content">{labels[score]}</span>
      </p>
    </div>
  );
}

export function FormAlert({ tone, children }: { tone: "danger" | "success"; children: ReactNode }) {
  return (
    <div
      role="alert"
      className={cn(
        "mb-5 flex items-start gap-2.5 rounded-sm border px-3.5 py-3 text-sm font-medium",
        tone === "danger"
          ? "border-danger/30 bg-danger-soft text-content"
          : "border-success/30 bg-success-soft text-content",
      )}
    >
      <span aria-hidden>{tone === "danger" ? "⚠️" : "✅"}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
