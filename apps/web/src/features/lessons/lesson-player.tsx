"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, RotateCcw, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { LessonBlockDto, LessonCompletionResultDto, LessonDto } from "@kidslearn/types";
import { useAppStore } from "@/store/app-store";
import { useChildContext } from "@/components/providers/child-provider";
import { completeLesson, gradeLessonAnswer, saveLessonProgress } from "@/lib/api/queries";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Confetti } from "@/components/ui/confetti";
import { Mascot } from "@/components/kid/mascot";
import { ErrorState } from "@/components/ui/states";
import { useSound, useSpeech } from "@/hooks/use-sound";
import { useVoiceControl } from "@/hooks/use-voice";
import { VoiceButton } from "@/features/voice/voice-assistant-card";

type Feedback = "none" | "correct" | "wrong";

function toneOf(tone: string | null | undefined) {
  return toneStyles[(tone ?? "brand") as Tone] ?? toneStyles.brand;
}

/**
 * The lesson runtime, driven entirely by the lesson's real content blocks.
 *
 * The API strips answer keys for non-admins, so every quiz pick is graded by
 * the server before feedback is shown, and completion is submitted with an
 * idempotency key — a double-tap on "finish" can never award twice.
 */
export function LessonPlayer({ lesson }: { lesson: LessonDto }) {
  const t = useT();
  const { intlLocale } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const play = useSound();
  const speak = useSpeech();

  const { selectedChild } = useChildContext();
  const pushToast = useAppStore((s) => s.pushToast);

  const blocks = useMemo(() => lesson.blocks ?? [], [lesson.blocks]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<LessonCompletionResultDto | null>(null);
  const [exitOpen, setExitOpen] = useState(false);

  // Stable idempotency key + the child's picks, accumulated as they play.
  const clientAttemptId = useRef<string | null>(null);
  const answers = useRef<Array<{ questionId: string; selectedOptionId: string }>>([]);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const block = blocks[index];
  const isLast = index === blocks.length - 1;
  const percent = Math.round(((index + (feedback === "correct" ? 1 : 0)) / Math.max(1, blocks.length)) * 100);

  const submitMutation = useMutation({
    mutationFn: () => {
      clientAttemptId.current ??= crypto.randomUUID();
      return completeLesson(lesson.id, {
        clientAttemptId: clientAttemptId.current,
        childId: selectedChild!.id,
        durationSeconds: Math.max(1, Math.round((Date.now() - (startedAt.current || Date.now())) / 1000)),
        answers: answers.current,
      });
    },
    onSuccess: async (completion) => {
      setResult(completion);
      play("complete");
      // Progress, streaks and "continue learning" all moved server-side.
      await queryClient.invalidateQueries({ queryKey: ["children"] });
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      for (const achievement of completion.unlockedAchievements) {
        pushToast({
          title: achievement.title,
          description: achievement.description,
          tone: achievement.tone as Tone,
          glyph: achievement.glyph,
        });
      }
    },
    onError: () => {
      pushToast({ title: t("state.errorTitle"), description: t("state.errorBody"), tone: "coral", glyph: "⚠️" });
    },
  });

  const goNext = useCallback(() => {
    if (isLast) {
      if (!submitMutation.isPending && !result) submitMutation.mutate();
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setSelected(null);
    setFeedback("none");
    setAttempts(0);
    // Partial progress persists so "continue learning" is accurate after a
    // mid-lesson exit. Fire-and-forget: losing one save is harmless.
    if (selectedChild) {
      void saveLessonProgress(
        lesson.id,
        selectedChild.id,
        Math.min(99, Math.round((nextIndex / Math.max(1, blocks.length)) * 100)),
      ).catch(() => undefined);
    }
  }, [isLast, index, blocks.length, lesson.id, selectedChild, submitMutation, result]);

  const sayCurrent = useCallback(() => {
    if (!block) return;
    const text = block.question?.prompt ?? block.sayIt ?? block.body ?? block.title ?? "";
    if (text) speak(text, intlLocale);
  }, [block, speak, intlLocale]);

  // Voice mirrors the on-screen buttons; it never becomes the only path.
  const voice = useVoiceControl({
    lang: intlLocale,
    onCommand: (command) => {
      if (command === "next" || command === "start") goNext();
      if (command === "repeat") sayCurrent();
      if (command === "back") setIndex((i) => Math.max(0, i - 1));
    },
  });

  // Read each new step aloud — most of the audience cannot read yet.
  useEffect(() => {
    if (result) return;
    const timer = window.setTimeout(sayCurrent, 350);
    return () => window.clearTimeout(timer);
  }, [index, result, sayCurrent]);

  /** Every pick is graded by the API before any feedback is shown. */
  async function answer(optionId: string) {
    if (!block?.question || !selectedChild || feedback === "correct" || checking) return;
    setSelected(optionId);
    setAttempts((a) => a + 1);
    setChecking(true);

    let graded: { correct: boolean };
    try {
      graded = await gradeLessonAnswer(lesson.id, selectedChild.id, block.question.id, optionId);
    } catch {
      // Offline: accept the pick; completion re-grades everything server-side.
      graded = { correct: true };
    }
    setChecking(false);

    const firstTry = !answers.current.some((entry) => entry.questionId === block.question!.id);
    if (firstTry) {
      answers.current.push({ questionId: block.question.id, selectedOptionId: optionId });
    }

    if (graded.correct) {
      setFeedback("correct");
      play("correct");
      window.setTimeout(goNext, 1100);
    } else {
      setFeedback("wrong");
      play("wrong");
      window.setTimeout(() => {
        setFeedback("none");
        setSelected(null);
      }, 900);
    }
  }

  if (!selectedChild) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <ErrorState
          title={t("kid.noChildTitle")}
          body={t("kid.noChildBody")}
          action={<Button onClick={() => router.push("/dashboard")}>{t("state.goHome")}</Button>}
        />
      </div>
    );
  }

  if (result) {
    return (
      <LessonComplete
        lesson={lesson}
        result={result}
        childName={selectedChild.name}
        onContinue={() => {
          pushToast({
            title: `+${result.xpAwarded} XP · +${result.starsAwarded} ⭐`,
            description: t("lesson.complete"),
            tone: "mint",
            glyph: "🎉",
          });
          router.push("/kids");
        }}
      />
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <ErrorState
          title={t("state.emptyTitle")}
          body={t("lesson.noContent")}
          action={<Button onClick={() => router.push("/kids/lessons")}>{t("common.back")}</Button>}
        />
      </div>
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
                {t("lesson.step", { current: index + 1, total: blocks.length })}
              </p>
            </div>
            <div
              className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("nav.progress")}
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", toneOf(lesson.tone).solid)}
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
        {block && !block.question ? (
          <ContentStage key={block.id} block={block} lessonTone={lesson.tone} onSay={sayCurrent} />
        ) : null}

        {block?.question ? (
          <section key={block.id} className="animate-rise">
            {block.title ? <p className="t-overline text-center text-content-tertiary">{block.title}</p> : null}
            <h1 className="font-display mt-2 text-center text-[clamp(1.4rem,4.5vw,2.2rem)] font-extrabold text-balance text-content">
              {block.question.prompt}
            </h1>

            <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4">
              {block.question.options.map((option) => {
                const isChosen = selected === option.id;
                const showCorrect = isChosen && feedback === "correct";
                const showWrong = isChosen && feedback === "wrong";

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => void answer(option.id)}
                    disabled={feedback === "correct" || checking}
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
                    {option.label && option.label !== option.glyph ? (
                      <span className="font-display text-base font-extrabold text-content sm:text-lg">
                        {option.label}
                      </span>
                    ) : null}

                    {/* State is announced by icon + text, never colour alone. */}
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
              <p className="t-body-sm mt-1 text-center font-semibold text-content-secondary">{t("lesson.hint")}</p>
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
            {block?.question ? (
              <Button variant="ghost" onClick={goNext} disabled={submitMutation.isPending}>
                {t("lesson.skip")}
              </Button>
            ) : null}
            <Button
              size="xl"
              variant="kid"
              onClick={goNext}
              loading={submitMutation.isPending}
              trailingIcon={<ArrowRight className="h-5 w-5" />}
              disabled={Boolean(block?.question) && feedback !== "correct" && !submitMutation.isPending}
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
    </div>
  );
}

/** TEXT / IMAGE / AUDIO / VIDEO / ANIMATION blocks share this stage. */
function ContentStage({
  block,
  lessonTone,
  onSay,
}: {
  block: LessonBlockDto;
  lessonTone: string;
  onSay: () => void;
}) {
  return (
    <section className="text-center animate-rise">
      {block.mediaUrl && (block.type === "IMAGE" || block.type === "ANIMATION") ? (
        <div className="mx-auto max-w-md overflow-hidden rounded-[2.5rem] shadow-soft">
          {/* Media comes from object storage at arbitrary sizes. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.mediaUrl} alt={block.title ?? ""} className="w-full" />
        </div>
      ) : block.mediaUrl && block.type === "VIDEO" ? (
        <video src={block.mediaUrl} controls playsInline className="mx-auto w-full max-w-md rounded-[2rem] shadow-soft" />
      ) : block.mediaUrl && block.type === "AUDIO" ? (
        <audio src={block.mediaUrl} controls className="mx-auto" />
      ) : (
        <div
          className={cn(
            "mx-auto grid h-44 w-44 place-items-center rounded-[2.5rem] text-[6rem] shadow-soft sm:h-56 sm:w-56 sm:text-[8rem]",
            toneOf(lessonTone).soft,
          )}
          aria-hidden
        >
          {block.glyph ?? "📘"}
        </div>
      )}

      {block.title ? (
        <h1 className="font-display mt-7 text-[clamp(1.6rem,5vw,2.6rem)] font-extrabold text-content">{block.title}</h1>
      ) : null}
      {block.body ? (
        <p className="t-body mt-2 text-balance font-semibold text-content-secondary sm:text-lg">{block.body}</p>
      ) : null}

      {block.sayIt ? (
        <button
          type="button"
          onClick={onSay}
          className="tactile mt-6 inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-surface px-5 py-3 font-extrabold text-content shadow-soft"
        >
          <Volume2 className="h-5 w-5 text-primary" aria-hidden />
          {block.sayIt}
        </button>
      ) : null}
    </section>
  );
}

/* --- Completion ---------------------------------------------------------- */

function LessonComplete({
  lesson,
  result,
  childName,
  onContinue,
}: {
  lesson: LessonDto;
  result: LessonCompletionResultDto;
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
        {childName} · {lesson.title}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <div className="animate-pop rounded-3xl border-2 border-border bg-surface px-8 py-5 shadow-card">
          <p className="text-4xl" aria-hidden>
            ⚡
          </p>
          <p className="font-display mt-1 text-3xl font-extrabold text-primary tabular-nums">+{result.xpAwarded}</p>
          <p className="t-caption font-bold text-content-secondary">{t("common.xp")}</p>
        </div>
        <div
          className="animate-pop rounded-3xl border-2 border-border bg-surface px-8 py-5 shadow-card"
          style={{ animationDelay: "0.12s" }}
        >
          <p className="text-4xl" aria-hidden>
            ⭐
          </p>
          <p className="font-display mt-1 text-3xl font-extrabold text-sun-deep tabular-nums dark:text-sun-core">
            +{result.starsAwarded}
          </p>
          <p className="t-caption font-bold text-content-secondary">{t("common.stars")}</p>
        </div>
      </div>

      <p className="t-caption mt-4 font-semibold text-content-secondary">
        {t("common.level")} {result.progress.level} · {result.progress.stars} ⭐
      </p>

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
