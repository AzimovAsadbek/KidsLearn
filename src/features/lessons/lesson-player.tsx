"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { Lesson, LessonOption } from "@/types";
import { useAppStore } from "@/store/app-store";
import { getChild } from "@/data/children";
import { getSubject } from "@/data/subjects";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Confetti } from "@/components/ui/confetti";
import { Mascot } from "@/components/kid/mascot";
import { useSound, useSpeech } from "@/hooks/use-sound";
import { useVoiceControl } from "@/hooks/use-voice";
import { VoiceButton } from "@/features/voice/voice-assistant-card";

type Feedback = "none" | "correct" | "wrong";

/**
 * The lesson runtime. One component walks every step type, keeps the chrome
 * identical between them, and only changes what sits in the stage — which is
 * what makes a lesson feel like one continuous activity rather than a slideshow.
 */
export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const t = useT();
  const { intlLocale } = useI18n();
  const router = useRouter();
  const play = useSound();
  const speak = useSpeech();

  const childId = useAppStore((s) => s.selectedChildId);
  const child = getChild(childId);
  const completeLesson = useAppStore((s) => s.completeLesson);
  const pushToast = useAppStore((s) => s.pushToast);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  const steps = lesson.steps;
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const percent = Math.round(((index + (feedback === "correct" ? 1 : 0)) / steps.length) * 100);
  const subject = getSubject(lesson.subjectId);

  const finish = useCallback(() => {
    completeLesson(childId, lesson.id, lesson.xpReward, lesson.starReward, lesson.durationMinutes);
    setFinished(true);
    play("complete");
  }, [childId, completeLesson, lesson, play]);

  const goNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setFeedback("none");
    setAttempts(0);
  }, [isLast, finish]);

  const sayCurrent = useCallback(() => {
    if (!step) return;
    const text =
      step.kind === "quiz"
        ? step.prompt
        : step.kind === "practice"
          ? step.prompt
          : "sayIt" in step
            ? step.sayIt
            : step.body;
    speak(text, intlLocale);
  }, [step, speak, intlLocale]);

  // Voice control mirrors the on-screen buttons; it never becomes the only path.
  const voice = useVoiceControl({
    lang: intlLocale,
    onCommand: (command) => {
      if (command === "next" || command === "start") goNext();
      if (command === "repeat") sayCurrent();
      if (command === "back") setIndex((i) => Math.max(0, i - 1));
    },
  });

  // Read each new step aloud automatically — most of the audience cannot read yet.
  useEffect(() => {
    if (finished) return;
    const timer = window.setTimeout(sayCurrent, 350);
    return () => window.clearTimeout(timer);
  }, [index, finished, sayCurrent]);

  function answer(option: LessonOption, correctId: string) {
    if (feedback === "correct") return;
    setSelected(option.id);

    if (option.id === correctId) {
      setFeedback("correct");
      play("correct");
      window.setTimeout(goNext, 1100);
    } else {
      setFeedback("wrong");
      setAttempts((a) => a + 1);
      play("wrong");
      window.setTimeout(() => {
        setFeedback("none");
        setSelected(null);
      }, 900);
    }
  }

  if (finished) {
    return (
      <LessonComplete
        lesson={lesson}
        childName={child.name}
        onContinue={() => {
          pushToast({
            title: `+${lesson.xpReward} XP · +${lesson.starReward} ⭐`,
            description: `${lesson.title} completed`,
            tone: "mint",
            glyph: "🎉",
          });
          router.push("/kids");
        }}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ---- Player chrome ------------------------------------------------- */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center gap-3 px-4">
          <IconButton label={t("lesson.exit")} size="icon-sm" onClick={() => setExitOpen(true)}>
            <X className="h-5 w-5" />
          </IconButton>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="t-caption truncate font-bold text-content">{lesson.title}</p>
              <p className="t-caption shrink-0 font-bold text-content-secondary tabular-nums">
                {t("lesson.step", { current: index + 1, total: steps.length })}
              </p>
            </div>
            <div
              className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Lesson progress"
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", toneStyles[lesson.tone].solid)}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <IconButton label={t("kid.listen")} size="icon-sm" onClick={sayCurrent}>
            <Volume2 className="h-5 w-5" />
          </IconButton>
        </div>
      </header>

      {/* ---- Stage --------------------------------------------------------- */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-8">
        {step.kind === "intro" || step.kind === "teach" || step.kind === "celebrate" ? (
          <section className="text-center animate-rise" key={step.id}>
            <div
              className={cn(
                "mx-auto grid h-44 w-44 place-items-center rounded-[2.5rem] text-[6rem] shadow-soft sm:h-56 sm:w-56 sm:text-[8rem]",
                toneStyles[lesson.tone].soft,
              )}
              aria-hidden
            >
              {"glyph" in step ? step.glyph : lesson.glyph}
            </div>

            <h1 className="font-display mt-7 text-[clamp(1.6rem,5vw,2.6rem)] font-extrabold text-content">
              {step.title}
            </h1>
            <p className="t-body mt-2 text-balance font-semibold text-content-secondary sm:text-lg">{step.body}</p>

            {step.kind === "teach" ? (
              <button
                type="button"
                onClick={sayCurrent}
                className="tactile mt-6 inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-surface px-5 py-3 font-extrabold text-content shadow-soft"
              >
                <Volume2 className="h-5 w-5 text-primary" aria-hidden />
                {step.sayIt}
              </button>
            ) : null}
          </section>
        ) : null}

        {step.kind === "quiz" || step.kind === "practice" ? (
          <section key={step.id} className="animate-rise">
            <p className="t-overline text-center text-content-tertiary">{step.title}</p>
            <h1 className="font-display mt-2 text-center text-[clamp(1.4rem,4.5vw,2.2rem)] font-extrabold text-balance text-content">
              {step.prompt}
            </h1>

            <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4">
              {(step.kind === "quiz" ? step.options : step.targets).map((option) => {
                const isChosen = selected === option.id;
                const showCorrect = isChosen && feedback === "correct";
                const showWrong = isChosen && feedback === "wrong";

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => answer(option, step.correctId)}
                    disabled={feedback === "correct"}
                    aria-pressed={isChosen}
                    className={cn(
                      "tactile relative flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-3xl border-4 bg-surface p-4 shadow-soft transition-colors",
                      !isChosen && "border-border hover:border-primary",
                      showCorrect && "border-success bg-success-soft",
                      showWrong && "animate-wiggle border-danger bg-danger-soft",
                    )}
                  >
                    <span className="text-[3rem] leading-none sm:text-[4rem]" aria-hidden>
                      {option.glyph}
                    </span>
                    <span className="font-display text-base font-extrabold text-content sm:text-lg">
                      {option.label}
                    </span>

                    {/* State is announced by icon + text, never colour alone */}
                    {showCorrect ? (
                      <span className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-success text-lg text-white">
                        ✓
                      </span>
                    ) : null}
                    {showWrong ? (
                      <span className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-danger text-lg text-white">
                        ✕
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <p
              role="status"
              aria-live="polite"
              className={cn(
                "mt-6 text-center font-display text-xl font-extrabold",
                feedback === "correct" && "text-success",
                feedback === "wrong" && "text-danger",
                feedback === "none" && "text-transparent",
              )}
            >
              {feedback === "correct" ? t("kid.wellDone") : feedback === "wrong" ? t("kid.tryAgain") : "·"}
            </p>

            {attempts >= 2 && feedback !== "correct" ? (
              <p className="t-body-sm mt-1 text-center font-semibold text-content-secondary">
                Hint: listen again with the speaker button.
              </p>
            ) : null}
          </section>
        ) : null}
      </main>

      {/* ---- Footer controls ------------------------------------------------ */}
      <footer className="sticky bottom-0 border-t border-border/60 bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3">
          <IconButton label={t("kid.replay")} size="icon-lg" variant="secondary" onClick={sayCurrent}>
            <RotateCcw className="h-5 w-5" />
          </IconButton>

          {voice.supported ? (
            <VoiceButton
              state={voice.state}
              size={48}
              label={t("voice.assistant")}
              onClick={() => (voice.state === "listening" ? voice.stop() : voice.listen())}
            />
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            {step.kind === "quiz" || step.kind === "practice" ? (
              <Button variant="ghost" onClick={goNext}>
                {t("lesson.skip")}
              </Button>
            ) : null}
            <Button
              size="xl"
              variant="kid"
              onClick={goNext}
              trailingIcon={<ArrowRight className="h-5 w-5" />}
              disabled={(step.kind === "quiz" || step.kind === "practice") && feedback !== "correct"}
            >
              {isLast ? t("game.finish") : t("common.next")}
            </Button>
          </div>
        </div>
      </footer>

      <ConfirmDialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        onConfirm={() => router.push("/kids")}
        title={t("lesson.exit")}
        body={t("lesson.exitConfirm")}
        confirmLabel={t("lesson.exit")}
        cancelLabel={t("common.cancel")}
        tone="primary"
      />

      <span className="sr-only" aria-live="polite">
        {subject.name} · {t("lesson.step", { current: index + 1, total: steps.length })}
      </span>
    </div>
  );
}

/* --- Completion ---------------------------------------------------------- */

export function LessonComplete({
  lesson,
  childName,
  onContinue,
}: {
  lesson: Lesson;
  childName: string;
  onContinue: () => void;
}) {
  const t = useT();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
      <Confetti active seed={lesson.id.length * 13} />

      <Mascot size={170} mood="cheer" />

      <h1 className="font-display mt-4 text-[clamp(2rem,7vw,3.2rem)] font-extrabold text-content">
        🎉 {t("kid.greatJob")}
      </h1>
      <p className="t-body mt-1 font-bold text-content-secondary">
        {childName}, {t("lesson.complete").toLowerCase()}: {lesson.title}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <div className="animate-pop rounded-3xl border-2 border-border bg-surface px-8 py-5 shadow-card">
          <p className="text-4xl" aria-hidden>
            ⚡
          </p>
          <p className="font-display mt-1 text-3xl font-extrabold text-primary tabular-nums">
            +{lesson.xpReward}
          </p>
          <p className="t-caption font-bold text-content-secondary">XP</p>
        </div>
        <div
          className="animate-pop rounded-3xl border-2 border-border bg-surface px-8 py-5 shadow-card"
          style={{ animationDelay: "0.12s" }}
        >
          <p className="text-4xl" aria-hidden>
            ⭐
          </p>
          <p className="font-display mt-1 text-3xl font-extrabold text-sun-deep tabular-nums dark:text-sun-core">
            +{lesson.starReward}
          </p>
          <p className="t-caption font-bold text-content-secondary">{t("common.stars")}</p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button size="xl" variant="kid" onClick={onContinue}>
          {t("common.continue")}
        </Button>
        <Link
          href="/kids/games"
          className="tactile inline-flex h-14 items-center rounded-lg border-2 border-border bg-surface px-6 font-extrabold text-content shadow-soft"
        >
          🎮 {t("kid.play")}
        </Link>
      </div>
    </div>
  );
}
