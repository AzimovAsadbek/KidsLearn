import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";

const FEATURES: Array<{ glyph: string; title: string; body: string; tone: Tone }> = [
  { glyph: "🧠", title: "AI recommendations", body: "Personalised next steps", tone: "grape" },
  { glyph: "🎤", title: "Voice control", body: "Learn hands-free", tone: "sky" },
  { glyph: "📱", title: "PWA support", body: "Install & use offline", tone: "lagoon" },
  { glyph: "🔔", title: "Push notifications", body: "Gentle daily nudges", tone: "tangerine" },
  { glyph: "📜", title: "Certificates", body: "Printable PDF awards", tone: "sun" },
  { glyph: "🌗", title: "Light & dark", body: "Comfortable for eyes", tone: "brand" },
  { glyph: "🛡️", title: "Parental control", body: "Safe by default", tone: "mint" },
  { glyph: "🌐", title: "Three languages", body: "Uzbek · Russian · English", tone: "blossom" },
];

/** The platform capability rail — mirrors the strip along the reference's base. */
export function PlatformFeatureStrip() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="t-h2 text-content">Platform features</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex items-center gap-3">
              <span
                className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-md text-2xl", toneStyles[feature.tone].soft)}
                aria-hidden
              >
                {feature.glyph}
              </span>
              <span className="min-w-0">
                <span className="t-h4 block truncate text-content">{feature.title}</span>
                <span className="t-caption block text-content-secondary">{feature.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
