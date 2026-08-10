"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, RotateCcw, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { GameAttemptResultDto, GameDto, GameSessionDto } from "@kidslearn/types";
import { useAppStore } from "@/store/app-store";
import { useChildContext } from "@/components/providers/child-provider";
import { gradeGameAnswer, queryKeys, startGameSession, submitGameAttempt } from "@/lib/api/queries";
import { ApiError } from "@/lib/api/client";
import { Button, IconButton, Spinner } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Confetti } from "@/components/ui/confetti";
import { Mascot } from "@/components/kid/mascot";
import { ErrorState } from "@/components/ui/states";
import { useSound, useSpeech } from "@/hooks/use-sound";
import { MemoryBoard } from "./memory-board";
import { PuzzleBoardView } from "./puzzle-board";
import { queueOfflineAttempt } from "./offline-queue";

type Phase = "intro" | "playing" | "done";

function toneOf(tone: string | null | undefined) {
  return toneStyles[(tone ?? "brand") as Tone] ?? toneStyles.brand;
}

/**
 * The reusable game shell.
 *
 * Rounds are dealt by the API and answers are graded there too, so the client
 * never holds an answer key and a score cannot be forged. Choice games share the
 * round runtime below; memory and puzzle plug their own board into the same
 * chrome, scoring and completion screen.
 */
export function GameEngine({ game }: { game: GameDto }) {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedChild } = useChildContext();
  const pushToast = useAppStore((s) => s.pushToast);

  const [phase, setPhase] = useState<Phase>("intro");
  const [session, setSession] = useState<GameSessionDto | null>(null);
  const [result, setResult] = useState<GameAttemptResultDto | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);

  const startMutation = useMutation({
    mutationFn: () => startGameSession(game.slug, selectedChild!.id),
    onSuccess: (dealt) => {
      setSession(dealt);
      setResult(null);
      setPhase("playing");
    },
  });

  const submitMutation = useMutation({
    mutationFn: submitGameAttempt,
    onError: (error, variables) => {
      // A server rejection is final — queueing it would promise stars that can
      // never arrive. Only a network failure goes to the offline queue, whose
      // idempotency key makes the eventual replay safe.
      if (error instanceof ApiError) {
        pushToast({ title: error.message, tone: "coral", glyph: "⚠️" });
        return;
      }
      queueOfflineAttempt(variables as Parameters<typeof queueOfflineAttempt>[0]);
      pushToast({
        title: t("game.savedForLater"),
        description: t("game.savedForLaterBody"),
        tone: "sky",
        glyph: "📶",
      });
    },
    onSuccess: async (graded) => {
      setResult(graded);
      setPhase("done");
      // Progress, achievements and the leaderboard all move as a result of an
      // attempt, so their caches are invalidated rather than patched by hand.
      if (selectedChild) {
        await queryClient.invalidateQueries({ queryKey: ["children"] });
        await queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard("WEEKLY", selectedChild.id) });
      }
      for (const achievement of graded.unlockedAchievements) {
        pushToast({
          title: achievement.title,
          description: achievement.description,
          tone: achievement.tone as Tone,
          glyph: achievement.glyph,
        });
      }
    },
  });

  const start = useCallback(() => {
    if (!selectedChild) return;
    startMutation.mutate();
  }, [selectedChild, startMutation]);

  const replay = useCallback(() => {
    setAttemptKey((key) => key + 1);
    setResult(null);
    start();
  }, [start]);

  if (!selectedChild) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <ErrorState
          title={t("analytics.noChildTitle")}
          body={t("game.pickChildBody")}
          action={<Button onClick={() => router.push("/dashboard")}>{t("state.goHome")}</Button>}
        />
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <GameComplete
        game={game}
        result={result}
        onReplay={replay}
        onExit={() => {
          pushToast({
            title: `+${result.xpAwarded} XP · +${result.starsAwarded} ⭐`,
            description: game.title,
            tone: "mint",
            glyph: "🎮",
          });
          router.push("/kids/games");
        }}
      />
    );
  }

  if (phase === "playing" && session) {
    return (
      <>
        <GameStage
          key={attemptKey}
          game={game}
          session={session}
          childId={selectedChild.id}
          submitting={submitMutation.isPending}
          error={submitMutation.error}
          onSubmit={(payload) => submitMutation.mutate(payload)}
          onExit={() => setExitOpen(true)}
        />
        <ConfirmDialog
          open={exitOpen}
          onClose={() => setExitOpen(false)}
          onConfirm={() => router.push("/kids/games")}
          title={t("game.leaveTitle")}
          body={t("game.leaveBody")}
          confirmLabel={t("game.leave")}
          cancelLabel={t("common.cancel")}
          tone="primary"
        />
      </>
    );
  }

  return (
    <GameIntro
      game={game}
      loading={startMutation.isPending}
      error={startMutation.error}
      onStart={start}
      onExit={() => router.push("/kids/games")}
    />
  );
}

/* --- Intro --------------------------------------------------------------- */

function GameIntro({
  game,
  loading,
  error,
  onStart,
  onExit,
}: {
  game: GameDto;
  loading: boolean;
  error: unknown;
  onStart: () => void;
  onExit: () => void;
}) {
  const t = useT();
  const difficultyKey = `lesson.difficulty${game.difficulty[0]}${game.difficulty.slice(1).toLowerCase()}` as "lesson.difficultyEasy";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
      <span
        className={cn("grid h-40 w-40 place-items-center rounded-[2.5rem] text-[6rem] shadow-soft", toneOf(game.tone).soft)}
        aria-hidden
      >
        {game.glyph}
      </span>
      <h1 className="font-display mt-6 text-[clamp(1.8rem,6vw,3rem)] font-extrabold text-content">{game.title}</h1>
      <p className="t-body mt-2 max-w-md text-balance font-semibold text-content-secondary">{game.description}</p>

      <dl className="mt-6 flex gap-6">
        {[
          [t("game.rounds"), game.type === "MEMORY" ? t("game.pairsShort", { count: 6 }) : game.type === "PUZZLE" ? t("game.piecesShort", { count: 9 }) : String(game.roundsPerSession)],
          [t("game.ages"), game.ageCategory.replace("AGE_", "").replace("_", "–")],
          [t("common.level"), t(difficultyKey)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="t-caption font-bold text-content-secondary">{label}</dt>
            <dd className="font-display text-lg font-extrabold text-content">{value}</dd>
          </div>
        ))}
      </dl>

      {error ? (
        <p role="alert" className="t-body-sm mt-6 max-w-sm font-semibold text-danger">
          {error instanceof ApiError ? error.message : t("state.errorTitle")}
        </p>
      ) : null}

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Button size="xl" variant="kid" onClick={onStart} loading={loading}>
          ▶ {t("kid.play")}
        </Button>
        <Button size="xl" variant="secondary" onClick={onExit}>
          {t("common.back")}
        </Button>
      </div>
    </div>
  );
}

/* --- Stage --------------------------------------------------------------- */

interface AttemptPayload {
  clientAttemptId: string;
  childId: string;
  sessionId: string;
  durationSeconds: number;
  answers?: Array<{ questionId: string; selectedOptionId: string; correct: boolean }>;
  boardResult?: { moves: number; matchedPairs?: number; placedPieces?: number };
}

function GameStage({
  game,
  session,
  childId,
  submitting,
  error,
  onSubmit,
  onExit,
}: {
  game: GameDto;
  session: GameSessionDto;
  childId: string;
  submitting: boolean;
  error: unknown;
  onSubmit: (payload: AttemptPayload) => void;
  onExit: () => void;
}) {
  const t = useT();
  const { intlLocale } = useI18n();
  const play = useSound();
  const speak = useSpeech();

  const rounds = session.rounds;
  const usesRounds = rounds.length > 0;

  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");
  const [seconds, setSeconds] = useState(0);

  // A stable idempotency key per attempt. Generated on first use rather than
  // during render — randomUUID() is impure, and a retry must reuse the same key
  // so the API can recognise the replay.
  const clientAttemptId = useRef<string | null>(null);
  const answers = useRef<Array<{ questionId: string; selectedOptionId: string; correct: boolean }>>([]);
  // Stamped in the effect below, not during render: Date.now() is impure and
  // the clock should start when the board is actually on screen.
  const startedAt = useRef(0);

  // A count-up timer, not a countdown: young children shouldn't be raced.
  useEffect(() => {
    startedAt.current = Date.now();
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const round = rounds[roundIndex];

  const speakPrompt = useCallback(() => {
    if (round) speak(round.prompt, intlLocale);
  }, [round, speak, intlLocale]);

  useEffect(() => {
    if (!usesRounds) return;
    const timer = window.setTimeout(speakPrompt, 300);
    return () => window.clearTimeout(timer);
  }, [roundIndex, speakPrompt, usesRounds]);

  const finish = useCallback(
    (payload: Omit<AttemptPayload, "clientAttemptId" | "childId" | "sessionId" | "durationSeconds">) => {
      play("complete");
      // A bare UUID: already unique, and it stays inside the API's 64-character
      // limit for the idempotency key.
      clientAttemptId.current ??= crypto.randomUUID();
      onSubmit({
        clientAttemptId: clientAttemptId.current,
        childId,
        sessionId: session.sessionId,
        durationSeconds: Math.max(1, Math.round((Date.now() - (startedAt.current || Date.now())) / 1000)),
        ...payload,
      });
    },
    [childId, onSubmit, play, session.sessionId],
  );

  /**
   * Each pick is graded by the API before any feedback is shown, so a wrong
   * answer never flashes green. A wrong pick lets the child try again; the
   * first pick per question is what counts towards the score.
   */
  async function choose(optionId: string) {
    if (feedback !== "none" || !round || submitting) return;
    setSelected(optionId);
    setAttempts((a) => a + 1);

    let graded: { correct: boolean };
    try {
      graded = await gradeGameAnswer(session.sessionId, round.questionId, optionId);
    } catch {
      // Offline or a hiccup: accept the pick, record it, and let the final
      // submit (or the offline queue) settle the score.
      graded = { correct: true };
    }

    const isFirstAttempt = !answers.current.some((answer) => answer.questionId === round.questionId);
    if (isFirstAttempt) {
      answers.current.push({ questionId: round.questionId, selectedOptionId: optionId, correct: graded.correct });
    }

    if (graded.correct) {
      setFeedback("correct");
      play("correct");
      if (isFirstAttempt) setScore((current) => current + 1);

      window.setTimeout(() => {
        if (roundIndex === rounds.length - 1) {
          finish({ answers: answers.current });
          return;
        }
        setRoundIndex((i) => i + 1);
        setSelected(null);
        setFeedback("none");
      }, 850);
      return;
    }

    setFeedback("wrong");
    play("wrong");
    window.setTimeout(() => {
      setFeedback("none");
      setSelected(null);
    }, 750);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center gap-3 px-4">
          <IconButton label={t("common.close")} size="icon-sm" onClick={onExit}>
            <X className="h-5 w-5" />
          </IconButton>

          <p className="t-label min-w-0 flex-1 truncate text-content">{game.title}</p>

          <div className="flex items-center gap-2">
            <HudChip glyph="⭐" label={t("game.score")} value={score} />
            {usesRounds ? (
              <HudChip
                glyph="🎯"
                label={t("game.round", { current: roundIndex + 1, total: rounds.length })}
                value={`${roundIndex + 1}/${rounds.length}`}
              />
            ) : null}
            <HudChip
              icon={<Clock className="h-3.5 w-3.5" aria-hidden />}
              label={t("game.time")}
              value={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
            />
          </div>
        </div>

        {usesRounds ? (
          <div className="h-1.5 bg-surface-muted">
            <div
              className={cn("h-full transition-[width] duration-500", toneOf(game.tone).solid)}
              style={{ width: `${((roundIndex + (feedback === "correct" ? 1 : 0)) / rounds.length) * 100}%` }}
            />
          </div>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-8">
        {submitting ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="t-body font-bold text-content-secondary">{t("game.savingScore")}</p>
          </div>
        ) : session.board?.kind === "MEMORY" ? (
          <MemoryBoard
            cards={session.board.cards ?? []}
            onComplete={(pairs, flips) => finish({ boardResult: { moves: flips, matchedPairs: pairs } })}
          />
        ) : session.board?.kind === "PUZZLE" && session.board.puzzle ? (
          <PuzzleBoardView
            board={session.board.puzzle}
            onComplete={(placed, moves) => finish({ boardResult: { moves, placedPieces: placed } })}
          />
        ) : round ? (
          <section key={round.id} className="animate-rise">
            <div className="text-center">
              {game.type === "ANIMAL_SOUNDS" ? (
                <button
                  type="button"
                  onClick={speakPrompt}
                  className="tactile mx-auto flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-full bg-tangerine-soft shadow-card dark:bg-tangerine-core/20"
                  aria-label={`Play sound: ${round.prompt}`}
                >
                  <Volume2 className="h-10 w-10 text-tangerine-deep dark:text-tangerine-core" aria-hidden />
                  <span className="font-display text-lg font-extrabold text-tangerine-deep dark:text-tangerine-core">
                    {round.prompt}
                  </span>
                </button>
              ) : (
                <div
                  className={cn("mx-auto grid h-32 w-32 place-items-center rounded-[2rem] shadow-soft", toneOf(round.promptTone ?? game.tone).soft)}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "font-display font-extrabold leading-none",
                      (round.promptGlyph ?? "").length > 3 ? "text-3xl" : "text-6xl",
                    )}
                  >
                    {round.promptGlyph ?? game.glyph}
                  </span>
                </div>
              )}

              <h1 className="font-display mt-5 text-[clamp(1.4rem,4.5vw,2.2rem)] font-extrabold text-balance text-content">
                {round.prompt}
              </h1>
            </div>

            <div
              className={cn(
                "mx-auto mt-8 grid max-w-2xl gap-4",
                round.options.length <= 3 ? "grid-cols-3" : round.options.length <= 4 ? "grid-cols-2" : "grid-cols-3",
              )}
            >
              {round.options.map((option) => {
                const isChosen = selected === option.id;
                const showCorrect = isChosen && feedback === "correct";
                const showWrong = isChosen && feedback === "wrong";
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => void choose(option.id)}
                    disabled={feedback === "correct"}
                    className={cn(
                      "tactile relative flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border-4 bg-surface p-3 shadow-soft transition-colors",
                      !isChosen && "border-border hover:border-primary",
                      showCorrect && "border-success bg-success-soft",
                      showWrong && "animate-wiggle border-danger bg-danger-soft",
                    )}
                    aria-label={option.label}
                  >
                    <span className="text-[3rem] leading-none sm:text-[3.5rem]" aria-hidden>
                      {option.glyph}
                    </span>
                    {game.type !== "COLOR_MATCH" && option.label !== option.glyph ? (
                      <span className="font-display text-sm font-extrabold text-content">{option.label}</span>
                    ) : null}

                    {/* State is announced by icon as well as colour. */}
                    {showCorrect ? (
                      <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-success text-white">
                        ✓
                      </span>
                    ) : null}
                    {showWrong ? (
                      <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-danger text-white">
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
              {feedback === "correct" ? t("game.correct") : feedback === "wrong" ? t("game.incorrect") : "·"}
            </p>

            {error ? (
              // Child-facing copy: no error codes, no API prose.
              <p role="alert" className="t-body-sm mt-6 text-center font-semibold text-content-secondary">
                We couldn&apos;t save that just now — your stars are safe and will be added shortly.
              </p>
            ) : null}
          </section>
        ) : null}
      </main>

      {usesRounds ? (
        <footer className="sticky bottom-0 border-t border-border/60 bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3">
            <IconButton label={t("kid.replay")} size="icon-lg" variant="secondary" onClick={speakPrompt}>
              <RotateCcw className="h-5 w-5" />
            </IconButton>
            <p className="t-caption font-bold text-content-secondary">
              {t("game.attempts")}: <span className="tabular-nums">{attempts}</span>
            </p>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

function HudChip({
  glyph,
  icon,
  label,
  value,
}: {
  glyph?: string;
  icon?: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <span
      className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1.5"
      title={label}
      aria-label={`${label}: ${value}`}
    >
      {glyph ? (
        <span aria-hidden className="text-sm">
          {glyph}
        </span>
      ) : (
        <span className="text-content-tertiary">{icon}</span>
      )}
      <span className="t-caption font-extrabold text-content tabular-nums">{value}</span>
    </span>
  );
}

/* --- Completion ---------------------------------------------------------- */

function GameComplete({
  game,
  result,
  onReplay,
  onExit,
}: {
  game: GameDto;
  result: GameAttemptResultDto;
  onReplay: () => void;
  onExit: () => void;
}) {
  const t = useT();
  const { plural } = useI18n();
  const perfect = result.score === result.total;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
      <Confetti active={result.starsAwarded >= 4} seed={result.score * 17 + 5} />

      <Mascot size={160} mood={perfect ? "cheer" : "happy"} />

      <h1 className="font-display mt-4 text-[clamp(1.9rem,6.5vw,3rem)] font-extrabold text-content">
        {perfect ? `🌟 ${t("kid.greatJob")}` : t("kid.wellDone")}
      </h1>
      <p className="t-body mt-1 font-bold text-content-secondary">{game.title}</p>

      <div className="mt-6 flex gap-2" aria-label={`${result.starsAwarded} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={cn("text-4xl transition-transform", star <= result.starsAwarded ? "animate-pop" : "opacity-25 grayscale")}
            style={{ animationDelay: `${star * 0.09}s` }}
            aria-hidden
          >
            ⭐
          </span>
        ))}
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-3 sm:gap-5">
        {[
          [t("game.score"), `${result.score}/${result.total}`, "🎯"],
          [t("game.accuracy"), `${result.accuracy}%`, "✅"],
          [t("game.time"), `${result.durationSeconds}s`, "⏱️"],
        ].map(([label, value, glyph]) => (
          <div key={label} className="rounded-2xl border-2 border-border bg-surface px-5 py-4 shadow-soft">
            <p className="text-2xl" aria-hidden>
              {glyph}
            </p>
            <dd className="font-display mt-1 text-xl font-extrabold text-content tabular-nums">{value}</dd>
            <dt className="t-caption font-bold text-content-secondary">{label}</dt>
          </div>
        ))}
      </dl>

      <p className="t-body mt-6 font-extrabold text-primary">
        +{result.xpAwarded} XP · +{result.starsAwarded} ⭐
      </p>
      <p className="t-caption mt-1 font-semibold text-content-secondary">
        {t("common.level")} {result.progress.level} · {plural("plural.stars", result.progress.stars)}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="xl" variant="kid" onClick={onReplay}>
          🔁 {t("game.playAgain")}
        </Button>
        <Button size="xl" variant="secondary" onClick={onExit}>
          {t("common.continue")}
        </Button>
        <Link
          href="/kids"
          className="tactile inline-flex h-14 items-center rounded-lg border-2 border-border bg-surface px-6 font-extrabold text-content shadow-soft"
        >
          🏠 {t("nav.home")}
        </Link>
      </div>
    </div>
  );
}
