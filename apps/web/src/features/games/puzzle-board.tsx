"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import { useSound } from "@/hooks/use-sound";

interface Piece {
  id: string;
  glyph: string;
  slot: number;
}

export interface PuzzleBoardData {
  title: string;
  tone: string;
  solution: string[];
  tray: Piece[];
}

/**
 * Nine-tile picture puzzle. Drag-and-drop is the primary interaction, but every
 * piece is also a button: tap a piece, then tap a slot. Pointer-only puzzles are
 * unusable on assistive tech and frustrating for small hands.
 */
export function PuzzleBoardView({
  board,
  onComplete,
}: {
  board: PuzzleBoardData;
  onComplete: (placed: number, moves: number) => void;
}) {
  const t = useT();
  const play = useSound();
  const tone = (toneStyles[board.tone as Tone] ?? toneStyles.sun).soft;

  const initialTray = useMemo(() => board.tray, [board.tray]);
  const [tray, setTray] = useState<Piece[]>(initialTray);
  const [slots, setSlots] = useState<Array<Piece | null>>(Array.from({ length: 9 }, () => null));
  const [heldId, setHeldId] = useState<string | null>(null);
  const [moves, setMoves] = useState(0);
  const [wrongSlot, setWrongSlot] = useState<number | null>(null);

  const placed = slots.filter(Boolean).length;

  useEffect(() => {
    if (placed < 9) return;
    const timer = window.setTimeout(() => onComplete(9, moves), 600);
    return () => window.clearTimeout(timer);
  }, [placed, moves, onComplete]);

  function place(pieceId: string, slotIndex: number) {
    const piece = tray.find((p) => p.id === pieceId);
    if (!piece || slots[slotIndex]) return;

    setMoves((m) => m + 1);
    setHeldId(null);

    if (piece.slot !== slotIndex) {
      play("wrong");
      setWrongSlot(slotIndex);
      window.setTimeout(() => setWrongSlot(null), 600);
      return;
    }

    play("correct");
    setSlots((current) => {
      const next = [...current];
      next[slotIndex] = piece;
      return next;
    });
    setTray((current) => current.filter((p) => p.id !== pieceId));
  }

  return (
    <section>
      <h1 className="font-display text-center text-[clamp(1.4rem,4.5vw,2rem)] font-extrabold text-content">
        {t("game.buildPicture")}
      </h1>
      <p className="t-body-sm mt-1 text-center font-bold text-content-secondary tabular-nums">
        {board.title} · {placed}/9 pieces · {moves} moves
      </p>

      {/* Board */}
      <div
        className={cn(
          "mx-auto mt-6 grid aspect-square w-full max-w-sm grid-cols-3 gap-1.5 rounded-3xl border-4 border-border p-2 shadow-soft",
          tone,
        )}
      >
        {slots.map((piece, index) => (
          <button
            key={index}
            type="button"
            onClick={() => heldId && place(heldId, index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) place(id, index);
            }}
            disabled={Boolean(piece)}
            aria-label={piece ? `Slot ${index + 1}, filled` : `Slot ${index + 1}, empty`}
            className={cn(
              "grid place-items-center rounded-xl border-2 border-dashed text-[2rem] transition-colors sm:text-[2.5rem]",
              piece ? "border-transparent bg-surface" : "border-border-strong/60 bg-surface/50",
              !piece && heldId && "border-primary bg-primary-soft",
              wrongSlot === index && "animate-wiggle border-danger bg-danger-soft",
            )}
          >
            <span aria-hidden>{piece?.glyph ?? ""}</span>
          </button>
        ))}
      </div>

      {/* Tray */}
      <div className="mx-auto mt-5 max-w-md">
        <p className="t-caption mb-2 text-center font-bold text-content-secondary">
          {heldId ? t("puzzle.tapWhere") : t("puzzle.tapOrDrag")}
        </p>
        <div className="flex flex-wrap justify-center gap-2.5 rounded-2xl border-2 border-border bg-surface p-3">
          {tray.length === 0 ? (
            <p className="t-body-sm py-3 font-bold text-success">{t("puzzle.allPlaced")} 🎉</p>
          ) : (
            tray.map((piece) => (
              <button
                key={piece.id}
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", piece.id)}
                onClick={() => setHeldId((current) => (current === piece.id ? null : piece.id))}
                aria-pressed={heldId === piece.id}
                aria-label={`Puzzle piece ${piece.glyph}`}
                className={cn(
                  "tactile grid h-14 w-14 place-items-center rounded-xl border-2 bg-surface text-[1.75rem] shadow-soft",
                  heldId === piece.id ? "border-primary ring-2 ring-primary/40" : "border-border",
                )}
              >
                <span aria-hidden>{piece.glyph}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
