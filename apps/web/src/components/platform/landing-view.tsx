"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import type { TranslationKey } from "@/i18n/config";
import { BrandMark } from "@/components/layout/brand-mark";
import { Mascot } from "@/components/kid/mascot";
import { LandingControls } from "./landing-controls";

/**
 * The public landing page. It has one job: tell a first-time parent what
 * KidsLearn is and get them to create the family account. Every claim on it is
 * true of the product, and every string comes from the dictionary.
 */
export function LandingView() {
  const t = useT();

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandMark href="/" />
        <LandingControls />
      </header>

      <main id="main">
        <section className="relative overflow-hidden">
          {/* Ambient brand wash — kept subtle so the copy stays the focus. */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            aria-hidden
            style={{
              background:
                "radial-gradient(900px 420px at 78% 8%, color-mix(in oklab, var(--color-blossom-soft) 70%, transparent), transparent 60%), radial-gradient(700px 380px at 8% 0%, color-mix(in oklab, var(--color-sky-soft) 70%, transparent), transparent 62%)",
            }}
          />

          <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-8 pt-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8 lg:pt-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 shadow-soft">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                <span className="t-caption font-bold text-content">{t("landing.badge")}</span>
              </span>

              <h1 className="t-display mt-5 max-w-2xl text-balance text-content">
                {t("landing.headline1")} <span className="text-primary">{t("landing.headline2")}</span>
              </h1>

              <p className="t-body mt-4 max-w-xl text-balance text-content-secondary">{t("landing.sub")}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-[0.9375rem] font-semibold text-primary-on shadow-card transition-colors hover:bg-primary-hover"
                >
                  {t("landing.ctaPrimary")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-surface px-6 text-[0.9375rem] font-semibold text-content shadow-soft transition-colors hover:bg-surface-muted"
                >
                  {t("auth.signIn")}
                </Link>
              </div>

              {/* True product facts — never invented usage numbers. */}
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                {(
                  [
                    ["9", "landing.factSubjects"],
                    ["6", "landing.factGames"],
                    ["3", "landing.factLanguages"],
                  ] as const
                ).map(([value, labelKey]) => (
                  <div key={labelKey}>
                    <dt className="t-h1 font-extrabold text-content tabular-nums">{value}</dt>
                    <dd className="t-caption font-semibold text-content-secondary">{t(labelKey)}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="canvas-kid rounded-3xl border border-border p-8 shadow-card">
                <div className="flex justify-center">
                  <Mascot size={200} mood="cheer" />
                </div>
                <div className="mt-4 rounded-2xl border border-border bg-surface/80 p-4 text-center backdrop-blur">
                  <p className="font-display text-xl font-extrabold text-content">{t("landing.mascotHi")}</p>
                  <p className="t-body-sm mt-1 text-content-secondary">{t("landing.mascotBody")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- The account model, stated plainly --------------------------- */}
        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="t-h2 text-content">{t("landing.howTitle")}</h2>
          <p className="t-body-sm mt-1 text-content-secondary">{t("landing.howSub")}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <AudienceCard
              tone="brand"
              glyph="👨‍👩‍👧"
              title={t("landing.parentCardTitle")}
              body={t("landing.parentCardBody")}
              points={[t("landing.parentPoint1"), t("landing.parentPoint2"), t("landing.parentPoint3")]}
              action={
                <Link
                  href="/register"
                  className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-sm bg-primary px-4 text-sm font-semibold text-primary-on transition-colors hover:bg-primary-hover"
                >
                  {t("landing.parentCardCta")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              }
            />
            <AudienceCard
              tone="blossom"
              glyph="🧒"
              title={t("landing.kidCardTitle")}
              body={t("landing.kidCardBody")}
              points={[t("landing.kidPoint1"), t("landing.kidPoint2"), t("landing.kidPoint3")]}
              action={
                <p className="t-caption mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 font-semibold text-content-secondary">
                  <span aria-hidden>🔒</span>
                  {t("landing.kidNoAccount")}
                </p>
              }
            />
          </div>
        </section>

        <FeatureStrip />
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <BrandMark href="/" />
          <p className="t-caption text-content-secondary">{t("landing.footerLine")}</p>
          <Link href="/login" className="t-caption font-semibold text-content-secondary hover:text-content hover:underline">
            {t("landing.teamSignIn")}
          </Link>
        </div>
      </footer>
    </div>
  );
}

function AudienceCard({
  tone,
  glyph,
  title,
  body,
  points,
  action,
}: {
  tone: Tone;
  glyph: string;
  title: string;
  body: string;
  points: string[];
  action?: React.ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-soft">
      <span className={cn("grid h-14 w-14 place-items-center rounded-lg text-3xl", toneStyles[tone].soft)} aria-hidden>
        {glyph}
      </span>
      <h3 className="t-h3 mt-4 text-content">{title}</h3>
      <p className="t-body-sm mt-1 text-content-secondary">{body}</p>
      <ul className="mt-4 space-y-1.5">
        {points.map((point) => (
          <li key={point} className="t-body-sm flex items-center gap-2 text-content">
            <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
            {point}
          </li>
        ))}
      </ul>
      <div className="mt-auto">{action}</div>
    </article>
  );
}

const FEATURES: Array<{ glyph: string; titleKey: TranslationKey; bodyKey: TranslationKey; tone: Tone }> = [
  { glyph: "🧠", titleKey: "landing.f1t", bodyKey: "landing.f1b", tone: "grape" },
  { glyph: "🎤", titleKey: "landing.f2t", bodyKey: "landing.f2b", tone: "sky" },
  { glyph: "📱", titleKey: "landing.f3t", bodyKey: "landing.f3b", tone: "lagoon" },
  { glyph: "🔔", titleKey: "landing.f4t", bodyKey: "landing.f4b", tone: "tangerine" },
  { glyph: "📜", titleKey: "landing.f5t", bodyKey: "landing.f5b", tone: "sun" },
  { glyph: "🌗", titleKey: "landing.f6t", bodyKey: "landing.f6b", tone: "brand" },
  { glyph: "🛡️", titleKey: "landing.f7t", bodyKey: "landing.f7b", tone: "mint" },
  { glyph: "🌐", titleKey: "landing.f8t", bodyKey: "landing.f8b", tone: "blossom" },
];

function FeatureStrip() {
  const t = useT();
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="t-h2 text-content">{t("landing.featuresTitle")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <li key={feature.titleKey} className="flex items-center gap-3">
              <span
                className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-md text-2xl", toneStyles[feature.tone].soft)}
                aria-hidden
              >
                {feature.glyph}
              </span>
              <span className="min-w-0">
                <span className="t-h4 block truncate text-content">{t(feature.titleKey)}</span>
                <span className="t-caption block text-content-secondary">{t(feature.bodyKey)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
