import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { Mascot } from "@/components/kid/mascot";
import { LandingControls } from "@/components/platform/landing-controls";

/**
 * Split auth shell: a brand panel that only appears once there's room for it,
 * and a form column that stays the primary content on every viewport.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-grape-core p-10 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5) 0, transparent 42%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.35) 0, transparent 45%)",
          }}
        />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-white/20 text-lg backdrop-blur">🎓</span>
          <span className="font-display text-xl font-extrabold">KidsLearn</span>
        </Link>

        <div className="relative my-auto max-w-md">
          <Mascot size={190} mood="happy" />
          <h2 className="t-display mt-6 text-white">Every star tells a story.</h2>
          <p className="t-body mt-3 text-white/85">
            Children collect stars, streaks and medals. Parents see what those actually mean — which
            subjects are strong, which need ten quiet minutes today.
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/25 pt-6">
            {[
              ["2,843", "Learners"],
              ["156", "Lessons"],
              ["92%", "Finish rate"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="t-h2 font-extrabold text-white tabular-nums">{value}</dt>
                <dd className="t-caption text-white/75">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative t-caption text-white/70">
          Safe by design — no photos, no public profiles, no ads.
        </p>
      </aside>

      {/* Form column */}
      <div className="flex flex-col bg-background">
        <header className="flex h-20 items-center justify-between px-5 sm:px-8">
          <span className="lg:invisible">
            <BrandMark href="/" />
          </span>
          <LandingControls />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
