import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { Mascot } from "@/components/kid/mascot";
import { PlatformFeatureStrip } from "@/components/platform/feature-strip";
import { LandingControls, RoleCard } from "@/components/platform/landing-controls";

export const metadata: Metadata = {
  title: "KidsLearn — Learning that feels like playing",
};

/**
 * Entry point. Rather than dropping straight into one dashboard, the product
 * opens on an explicit role choice — parent, child and admin are genuinely
 * different applications and the doorway should say so.
 */
export default function LandingPage() {
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
                <span className="t-caption font-bold text-content">Ages 1–7 · Uzbek · Russian · English</span>
              </span>

              <h1 className="t-display mt-5 max-w-2xl text-balance text-content">
                Learning that feels like <span className="text-primary">playing</span>
              </h1>

              <p className="t-body mt-4 max-w-xl text-balance text-content-secondary">
                Interactive lessons, games, rewards and streaks for children — with a calm, data-rich
                dashboard for parents and a complete content studio for your team.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-[0.9375rem] font-semibold text-primary-on shadow-card transition-colors hover:bg-primary-hover"
                >
                  Open parent dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/kids"
                  className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-surface px-6 text-[0.9375rem] font-semibold text-content shadow-soft transition-colors hover:bg-surface-muted"
                >
                  <span aria-hidden>🎈</span>
                  Enter kid mode
                </Link>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                {[
                  ["156", "Lessons"],
                  ["24", "Games"],
                  ["2,843", "Young learners"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="t-h1 font-extrabold text-content tabular-nums">{value}</dt>
                    <dd className="t-caption font-semibold text-content-secondary">{label}</dd>
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
                  <p className="font-display text-xl font-extrabold text-content">Hi, I&apos;m Leo!</p>
                  <p className="t-body-sm mt-1 text-content-secondary">
                    I&apos;ll be here for every lesson, game and gold medal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="t-h2 text-content">Choose how you want to enter</h2>
          <p className="t-body-sm mt-1 text-content-secondary">
            Three experiences, one product — each designed for who is actually holding the device.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <RoleCard
              href="/dashboard"
              tone="brand"
              glyph="👨‍👩‍👧"
              icon={<GraduationCap className="h-4 w-4" aria-hidden />}
              title="I'm a parent"
              body="Track progress, manage children's profiles and get AI-backed guidance."
              points={["Family overview", "Weekly analytics", "Certificates"]}
            />
            <RoleCard
              href="/kids"
              tone="blossom"
              glyph="🧒"
              icon={<span aria-hidden>⭐</span>}
              title="I'm a kid"
              body="Big buttons, friendly sounds, six games and a mascot who cheers you on."
              points={["Lessons & games", "Stars & medals", "Voice help"]}
            />
            <RoleCard
              href="/admin"
              tone="lagoon"
              glyph="🛠️"
              icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
              title="Platform admin"
              body="Author content, generate illustrations with AI and watch platform health."
              points={["Content workflow", "Media library", "Advanced analytics"]}
            />
          </div>
        </section>

        <PlatformFeatureStrip />
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <BrandMark href="/" />
          <p className="t-caption text-content-secondary">
            A complete product UI system — design tokens, three shells and every state.
          </p>
        </div>
      </footer>
    </div>
  );
}
