"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, RotateCcw, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { Game, GameResult } from "@/types";
import { ROUNDS_PER_GAME, buildRounds } from "@/data/games";
import { useAppStore } from "@/store/app-store";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Confetti } from "@/components/ui/confetti";
import { Mascot } from "@/components/kid/mascot";
import { useSound, useSpeech } from "@/hooks/use-sound";
import { MemoryBoard } from "./memory-board";
import { PuzzleBoardView } from "./puzzle-board";

type Phase = "intro" | "playing" | "done";

/**
 * The reusable game shell. Choice-based games (colour, sound, letter, number)
 * share the round runtime below; memory and puzzle plug their own board into the
 * same chrome, scoring and completion screen.
 */
export function GameEngine({ game }: { game: Game }) {
  const t = useT();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const recordGameResult = useAppStore((s) => s.recordGameResult);
  const childId = useAppStore((s) => s.selectedChildId);
  const pushToast = useAppStore((s) => s.pushToast);

  const finish = useCallback(
    (gameResult: GameResult) => {
      setResult(gameResult);
      setPhase("done");
      recordGameResult(childId, gameResult);
    },
    [childId, recordGameResult],
  );

  const restart = useCallback(() => {
    setAttempt((a) => a + 1);
    setResult(null);
    setPhase("playing");
  }, []);

  if (phase === "intro") {
    return <GameIntro game={game} onStart={() => setPhase("playing")} onExit={() => router.push("/kids/games")} />;
  }

  if (phase === "done" && result) {
    return (
      <GameComplete
        game={game}
        result={result}
        onReplay={restart}
        onExit={() => {
          pushToast({
            title: `+${result.xp} XP · +${result.stars} ⭐`,
            description: `${game.title} finished`,
            tone: "mint",
            glyph: "🎮",
          });
          router.push("/kids/games");
        }}
      />
    );
  }

  return (
    <>
      <GameStage key={attempt} game={game} seed={game.id.length * 31 + attempt * 101} onFinish={finish} onExit={() => setExitOpen(true)} />
      <ConfirmDialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        onConfirm={() => router.push("/kids/games")}
        title="Leave the game?"
        body="Your score in this round won't be saved."
        confirmLabel="Leave"
        cancelLabel={t("common.cancel")}
        tone="primary"
      />
    </>
  );
}

/* --- Intro --------------------------------------------------------------- */

function GameIntro({ game, onStart, onExit }: { game: Game; onStart: () => void; onExit: () => void }) {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
      <span
        className={cn("grid h-40 w-40 place-items-center rounded-[2.5rem] text-[6rem] shadow-soft", toneStyles[game.tone].soft)}
        aria-hidden
      >
        {game.glyph}
      </span>
      <h1 className="font-display mt-6 text-[clamp(1.8rem,6vw,3rem)] font-extrabold text-content">{game.title}</h1>
      <p className="t-body mt-2 max-w-md text-balance font-semibold text-content-secondary">{game.description}</p>

      <dl className="mt-6 flex gap-6">
        {[
          ["Rounds", game.type === "memory" ? "6 pairs" : game.type === "puzzle" ? "9 pieces" : `${ROUNDS_PER_GAME}`],
          ["Ages", game.ageBand],
          ["Level", t(`lesson.difficulty${game.difficulty[0].toUpperCase()}${game.difficulty.slice(1)}` as "lesson.difficultyEasy")],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="t-caption font-bold text-content-secondary">{label}</dt>
            <dd className="font-display text-lg font-extrabold text-content">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Button size="xl" variant="kid" onClick={onStart}>
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

function GameStage({
  game,
  seed,
  onFinish,
  onExit,
}: {
  game: Game;
  seed: number;
  onFinish: (result: GameResult) => void;
  onExit: () => void;
}) {
  const t = useT();
  const { intlLocale } = useI18n();
  const play = useSound();
  const speak = useSpeech();

  const rounds = useMemo(() => buildRounds(game.type, game.difficulty, seed), [game.type, game.difficulty, seed]);
  const usesRounds = game.type !== "memory" && game.type !== "puzzle";

  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(0);

  // A count-up timer, not a countdown: young children shouldn't be raced.
  useEffect(() => {
    startedAt.current = Date.now();
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const round = rounds[roundIndex];

  const promptText = useMemo(() => {
    if (!usesRounds || !round) return game.title;
    switch (game.type) {
      case "color-match":
        return t("game.findColor", { name: round.prompt });
      case "animal-sounds":
        return t("game.whichAnimal");
      case "letter-match":
        return t("game.findLetter", { name: round.prompt });
      case "number-match":
        // The prompt *is* the row of objects, so the question is "how many",
        // not "find the number 🍎🍎🍎".
        return t("game.countThem");
      default:
        return game.title;
    }
  }, [game.title, game.type, round, t, usesRounds]);

  const speakPrompt = useCallback(() => {
    if (!round) return;
    speak(game.type === "animal-sounds" ? round.prompt : promptText, intlLocale);
  }, [game.type, intlLocale, promptText, round, speak]);

  useEffect(() => {
    if (!usesRounds) return;
    const timer = window.setTimeout(speakPrompt, 300);
    return () => window.clearTimeout(timer);
  }, [roundIndex, speakPrompt, usesRounds]);

  const complete = useCallback(
    (finalScore: number, totalItems: number, totalAttempts: number) => {
      const accuracy = totalAttempts > 0 ? Math.round((finalScore / totalAttempts) * 100) : 100;
      const stars = finalScore === totalItems ? 5 : finalScore >= totalItems * 0.7 ? 4 : finalScore >= totalItems * 0.4 ? 3 : 2;
      play("complete");
      onFinish({
        gameId: game.id,
        score: finalScore,
        total: totalItems,
        stars,
        xp: finalScore * 5 + (finalScore === totalItems ? 10 : 0),
        accuracy,
        durationSeconds: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)),
      });
    },
    [game.id, onFinish, play],
  );

  function choose(optionId: string) {
    if (feedback === "correct" || !round) return;
    setSelected(optionId);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (optionId === round.correctId) {
      const nextScore = score + 1;
      setScore(nextScore);
      setFeedback("correct");
      play("correct");
      window.setTimeout(() => {
        if (roundIndex === rounds.length - 1) {
          complete(nextScore, rounds.length, nextAttempts);
          return;
        }
        setRoundIndex((i) => i + 1);
        setSelected(null);
        setFeedback("none");
      }, 900);
    } else {
      setFeedback("wrong");
      play("wrong");
      window.setTimeout(() => {
        setFeedback("none");
        setSelected(null);
      }, 750);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ---- HUD ---------------------------------------------------------- */}
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
              className={cn("h-full transition-[width] duration-500", toneStyles[game.tone].solid)}
              style={{ width: `${((roundIndex + (feedback === "correct" ? 1 : 0)) / rounds.length) * 100}%` }}
            />
          </div>
        ) : null}
      </header>

      {/* ---- Board -------------------------------------------------------- */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-8">
        {game.type === "memory" ? (
          <MemoryBoard seed={seed} onComplete={(pairs, flips) => complete(pairs, pairs, flips)} />
        ) : game.type === "puzzle" ? (
          <PuzzleBoardView seed={seed} onComplete={(placed, moves) => complete(placed, 9, moves)} />
        ) : round ? (
          <section key={round.id} className="animate-rise">
            {/* Prompt */}
            <div className="text-center">
              {game.type === "animal-sounds" ? (
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
                  className={cn(
                    "mx-auto grid h-32 w-32 place-items-center rounded-[2rem] shadow-soft",
                    round.promptTone ? toneStyles[round.promptTone].soft : toneStyles[game.tone].soft,
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "font-display font-extrabold leading-none",
                      game.type === "number-match" ? "text-4xl" : "text-6xl",
                    )}
                  >
                    {game.type === "number-match" ? round.prompt : round.promptGlyph}
                  </span>
                </div>
              )}

              <h1 className="font-display mt-5 text-[clamp(1.4rem,4.5vw,2.2rem)] font-extrabold text-balance text-content">
                {promptText}
              </h1>
            </div>

            {/* Options */}
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
                    onClick={() => choose(option.id)}
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
                    {/* Only caption the tile when the label adds something the
                        glyph doesn't already say — letters and numbers are their
                        own glyph, and repeating them reads as a duplicate. */}
                    {game.type !== "color-match" && option.label !== option.glyph ? (
                      <span className="font-display text-sm font-extrabold text-content">{option.label}</span>
                    ) : null}

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
  game: Game;
  result: GameResult;
  onReplay: () => void;
  onExit: () => void;
}) {
  const t = useT();
  const perfect = result.score === result.total;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
      <Confetti active={result.stars >= 4} seed={result.score * 17 + 5} />

      <Mascot size={160} mood={perfect ? "cheer" : "happy"} />

      <h1 className="font-display mt-4 text-[clamp(1.9rem,6.5vw,3rem)] font-extrabold text-content">
        {perfect ? `🌟 ${t("kid.greatJob")}` : t("kid.wellDone")}
      </h1>
      <p className="t-body mt-1 font-bold text-content-secondary">{game.title}</p>

      {/* Star rating, with the numeric score alongside it */}
      <div className="mt-6 flex gap-2" aria-label={`${result.stars} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={cn(
              "text-4xl transition-transform",
              star <= result.stars ? "animate-pop" : "opacity-25 grayscale",
            )}
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
          ["Accuracy", `${result.accuracy}%`, "✅"],
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
        +{result.xp} XP · +{result.stars} ⭐
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
