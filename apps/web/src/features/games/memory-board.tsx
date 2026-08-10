"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/provider";
import { useSound } from "@/hooks/use-sound";

export interface MemoryCard {
  id: string;
  glyph: string;
  matchKey: string;
}

/**
 * Memory. The deck is dealt by the API so the board is reproducible from a
 * session id. Cards flip with a 3D transform, mismatches turn back after a
 * beat, and every card keeps an accessible name so the board is playable with a
 * screen reader as well as by sight.
 */
export function MemoryBoard({
  cards,
  onComplete,
}: {
  cards: MemoryCard[];
  onComplete: (pairs: number, flips: number) => void;
}) {
  const t = useT();
  const play = useSound();
  const deck = useMemo(() => cards, [cards]);
  const PAIRS = deck.length / 2;

  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [flips, setFlips] = useState(0);

  // Derived, not stored: the board is locked exactly while a pair is resolving.
  const locked = flipped.length >= 2;

  // Resolve a pair once two cards are face up.
  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped.map((id) => deck.find((card) => card.id === id));

    if (a && b && a.matchKey === b.matchKey) {
      play("star");
      const timer = window.setTimeout(() => {
        setMatched((current) => [...current, a.id, b.id]);
        setFlipped([]);
      }, 480);
      return () => window.clearTimeout(timer);
    }

    play("wrong");
    const timer = window.setTimeout(() => setFlipped([]), 900);
    return () => window.clearTimeout(timer);
  }, [flipped, deck, play]);

  useEffect(() => {
    if (deck.length === 0 || matched.length < deck.length) return;
    const timer = window.setTimeout(() => onComplete(PAIRS, flips), 500);
    return () => window.clearTimeout(timer);
  }, [matched, deck.length, flips, onComplete, PAIRS]);

  function flip(id: string) {
    if (locked || flipped.includes(id) || matched.includes(id)) return;
    play("tap");
    setFlips((f) => f + 1);
    setFlipped((current) => [...current, id]);
  }

  return (
    <section>
      <h1 className="font-display text-center text-[clamp(1.4rem,4.5vw,2rem)] font-extrabold text-content">
        {t("game.matchPairs")}
      </h1>
      <p className="t-body-sm mt-1 text-center font-bold text-content-secondary tabular-nums">
        {matched.length / 2} / {PAIRS} pairs · {flips} flips
      </p>

      <div className="mx-auto mt-7 grid max-w-lg grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
        {deck.map((card) => {
          const isUp = flipped.includes(card.id) || matched.includes(card.id);
          const isMatched = matched.includes(card.id);

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(card.id)}
              disabled={isMatched}
              aria-label={isUp ? card.glyph : "Face-down card"}
              aria-pressed={isUp}
              className="group relative aspect-square [perspective:900px]"
            >
              <span
                className={cn(
                  "relative block h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d]",
                  isUp && "[transform:rotateY(180deg)]",
                )}
              >
                {/* Back */}
                <span
                  className={cn(
                    "absolute inset-0 grid place-items-center rounded-2xl border-4 border-border bg-gradient-to-br from-brand-400 to-brand-600 text-3xl text-white shadow-soft [backface-visibility:hidden]",
                    !isUp && "group-hover:scale-105",
                  )}
                  aria-hidden
                >
                  ?
                </span>
                {/* Front */}
                <span
                  className={cn(
                    "absolute inset-0 grid place-items-center rounded-2xl border-4 bg-surface text-[2.5rem] shadow-soft [backface-visibility:hidden] [transform:rotateY(180deg)]",
                    isMatched ? "border-success bg-success-soft" : "border-border",
                  )}
                  aria-hidden
                >
                  {card.glyph}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
