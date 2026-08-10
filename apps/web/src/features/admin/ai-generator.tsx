"use client";

import { useState } from "react";
import { Check, Info, RefreshCw, Save, Sparkles, X } from "lucide-react";
import { cn, seededRandom } from "@/lib/utils";
import { toneStyles, TONES, type Tone } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import { aiStyles, mediaAssets } from "@/data/admin";
import { subjects } from "@/data/subjects";
import { useAppStore } from "@/store/app-store";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";

/** Keyword → glyph map used to compose a deterministic preview illustration. */
const SUBJECT_GLYPHS: Array<[RegExp, string]> = [
  [/apple|fruit/i, "🍎"],
  [/lion|jungle/i, "🦁"],
  [/dog|puppy/i, "🐶"],
  [/cat|kitten/i, "🐱"],
  [/fish|ocean|whale/i, "🐋"],
  [/bird/i, "🐦"],
  [/sun|sunny/i, "☀️"],
  [/rain|cloud/i, "🌧️"],
  [/tree|forest|plant/i, "🌳"],
  [/flower/i, "🌸"],
  [/number|count/i, "🔢"],
  [/letter|alphabet/i, "🔤"],
  [/shape|circle|square/i, "🔷"],
  [/star/i, "⭐"],
  [/car|truck/i, "🚗"],
  [/house|home/i, "🏠"],
];

function glyphFor(prompt: string): string {
  return SUBJECT_GLYPHS.find(([pattern]) => pattern.test(prompt))?.[1] ?? "🎨";
}

/**
 * Deterministic preview artwork. Generation is not wired to a model in this
 * build, and the UI says so — what it does show is the real review, approval and
 * hand-off flow an editor would use once a provider is connected.
 */
function GeneratedArtwork({ prompt, seed, tone }: { prompt: string; seed: number; tone: Tone }) {
  const random = seededRandom(seed);
  const glyph = glyphFor(prompt);
  const blobs = Array.from({ length: 5 }, () => ({
    cx: 10 + random() * 80,
    cy: 10 + random() * 80,
    r: 8 + random() * 22,
    opacity: 0.18 + random() * 0.3,
  }));

  return (
    <div className={cn("relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl", toneStyles[tone].soft)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        {blobs.map((blob, i) => (
          <circle key={i} cx={blob.cx} cy={blob.cy} r={blob.r} fill={toneStyles[tone].hex} opacity={blob.opacity} />
        ))}
      </svg>
      <span className="relative text-[6rem] drop-shadow-sm sm:text-[8rem]" aria-hidden>
        {glyph}
      </span>
      <span className="sr-only">Preview illustration for: {prompt}</span>
    </div>
  );
}

export function AiGeneratorView() {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);

  const [prompt, setPrompt] = useState("A friendly red apple for a 3-year-old children's lesson");
  const [style, setStyle] = useState<string>(aiStyles[0].id);
  const [ageBand, setAgeBand] = useState("3-4");
  const [subjectId, setSubjectId] = useState(subjects[0].id);
  const [status, setStatus] = useState<"idle" | "generating" | "ready">("idle");
  const [seed, setSeed] = useState(11);

  const queue = mediaAssets.filter((asset) => asset.kind === "generated");
  const tone = TONES[seed % TONES.length];

  async function generate(nextSeed: number) {
    setStatus("generating");
    setSeed(nextSeed);
    // A visible, honest delay — this stands in for the provider round-trip.
    await new Promise((resolve) => setTimeout(resolve, 1400));
    setStatus("ready");
  }

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-6">
      <PageHeading
        title={t("nav.aiGenerator")}
        subtitle="Create age-appropriate illustrations, then route them through review before they reach a child."
        actions={<Badge tone="grape">{t("common.beta")}</Badge>}
      />

      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-info/30 bg-info-soft px-4 py-3"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
        <p className="t-body-sm text-content">
          <strong className="font-semibold">Preview mode.</strong> No image model is connected in this build, so
          generation returns a deterministic placeholder. The prompt controls, review queue and approval flow are
          the real ones.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        {/* ---- Prompt ---------------------------------------------------- */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-[0.5rem] bg-grape-soft dark:bg-grape-core/20">
                  <Sparkles className="h-4 w-4 text-grape-deep dark:text-grape-core" aria-hidden />
                </span>
                {t("ai.generateImage")}
              </span>
            }
          />
          <CardBody className="space-y-4">
            <Field label={t("ai.prompt")} hint="Describe the subject, the mood and who it's for." required>
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A friendly red apple for a 3-year-old children's lesson"
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("ai.style")}>
                {({ id }) => (
                  <Select id={id} value={style} onChange={(e) => setStyle(e.target.value)}>
                    {aiStyles.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.glyph} {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label={t("ai.ageRange")}>
                {({ id }) => (
                  <Select id={id} value={ageBand} onChange={(e) => setAgeBand(e.target.value)}>
                    {["1-2", "2-3", "3-4", "4-5", "5-6", "6-7"].map((band) => (
                      <option key={band} value={band}>
                        {band} years
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="Subject" className="sm:col-span-2">
                {({ id }) => (
                  <Select id={id} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.glyph} {subject.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <Button
              size="lg"
              fullWidth
              loading={status === "generating"}
              leadingIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => generate(seed + 7)}
              disabled={prompt.trim().length < 8}
            >
              {status === "generating" ? t("ai.generating") : t("ai.generate")}
            </Button>

            <p className="t-caption text-content-secondary">
              Every generated asset lands in review. Nothing reaches a child before an editor approves it.
            </p>
          </CardBody>
        </Card>

        {/* ---- Result ---------------------------------------------------- */}
        <Card className="flex flex-col">
          <CardHeader title="Generated image" subtitle={status === "ready" ? "Review, then save or regenerate" : "Your result appears here"} />
          <CardBody className="flex flex-1 flex-col">
            {status === "idle" ? (
              <div className="grid flex-1 place-items-center rounded-xl border-2 border-dashed border-border-strong p-10 text-center">
                <div>
                  <span className="text-5xl" aria-hidden>
                    🖼️
                  </span>
                  <p className="t-h4 mt-3 text-content">Nothing generated yet</p>
                  <p className="t-body-sm mt-1 max-w-xs text-content-secondary">
                    Write a prompt and press generate to see a preview.
                  </p>
                </div>
              </div>
            ) : status === "generating" ? (
              <div className="flex-1">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <p className="t-body-sm mt-4 flex items-center justify-center gap-2 font-semibold text-content-secondary">
                  <Sparkles className="h-4 w-4 animate-pulse text-grape-core" aria-hidden />
                  {t("ai.generating")}
                </p>
              </div>
            ) : (
              <div className="flex-1">
                <GeneratedArtwork prompt={prompt} seed={seed} tone={tone} />

                <dl className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="grape" size="sm">
                    {aiStyles.find((s) => s.id === style)?.label}
                  </Badge>
                  <Badge tone="sky" size="sm">
                    Ages {ageBand}
                  </Badge>
                  <Badge tone="mint" size="sm">
                    {subjects.find((s) => s.id === subjectId)?.name}
                  </Badge>
                  <Badge tone="sun" size="sm">
                    Pending review
                  </Badge>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button leadingIcon={<RefreshCw className="h-4 w-4" />} variant="secondary" onClick={() => generate(seed + 13)}>
                    {t("ai.regenerate")}
                  </Button>
                  <Button
                    leadingIcon={<Check className="h-4 w-4" />}
                    onClick={() => pushToast({ title: "Sent to review queue", tone: "mint", glyph: "🤖" })}
                  >
                    {t("ai.useImage")}
                  </Button>
                  <Button
                    variant="ghost"
                    leadingIcon={<Save className="h-4 w-4" />}
                    onClick={() => pushToast({ title: "Saved to media library", tone: "sky", glyph: "💾" })}
                  >
                    {t("ai.saveToLibrary")}
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ---- Review queue ------------------------------------------------- */}
      <Card>
        <CardHeader
          title={t("ai.reviewQueue")}
          subtitle={`${queue.length} generated assets waiting on an editor`}
          action={<Badge tone="sun">{queue.filter((a) => a.status === "review").length} pending</Badge>}
        />
        <CardBody>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {queue.map((asset) => (
              <li key={asset.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <div className={cn("grid aspect-square place-items-center text-6xl", toneStyles[asset.tone].soft)} aria-hidden>
                  {asset.glyph}
                </div>
                <div className="p-3">
                  <p className="t-body-sm truncate font-semibold text-content">{asset.name}</p>
                  {asset.aiPrompt ? (
                    <p className="t-caption mt-0.5 line-clamp-2 text-content-secondary">{asset.aiPrompt}</p>
                  ) : null}
                  <div className="mt-2">
                    <StatusBadge status={asset.status} />
                  </div>

                  {asset.status === "review" ? (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        fullWidth
                        leadingIcon={<Check className="h-3.5 w-3.5" />}
                        onClick={() => pushToast({ title: `${asset.name} approved`, tone: "mint", glyph: "✅" })}
                      >
                        {t("ai.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        aria-label={`${t("ai.reject")} ${asset.name}`}
                        onClick={() => pushToast({ title: `${asset.name} rejected`, tone: "coral", glyph: "🚫" })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
