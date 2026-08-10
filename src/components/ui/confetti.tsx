"use client";

import { useMemo } from "react";
import { seededRandom } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";

const COLORS = ["#7c4dff", "#ff5f9e", "#ffbe28", "#16c47f", "#3b8aff", "#ff8a3d"];

interface Piece {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  color: string;
  size: number;
  round: boolean;
}

/**
 * Celebration burst for lesson and game completions. Pure CSS transforms, and
 * it renders nothing at all when the user asks for reduced motion — the
 * completion screen carries the message on its own.
 */
export function Confetti({ active, pieces = 60, seed = 7 }: { active: boolean; pieces?: number; seed?: number }) {
  const reducedMotion = usePrefersReducedMotion();

  // The burst is a pure function of its inputs, so it is derived rather than
  // pushed into state from an effect.
  const items = useMemo<Piece[]>(() => {
    if (!active || reducedMotion) return [];
    const random = seededRandom(seed);
    return Array.from({ length: pieces }, () => ({
      left: random() * 100,
      delay: random() * 0.7,
      duration: 2.2 + random() * 1.6,
      drift: (random() - 0.5) * 220,
      spin: 360 + random() * 720,
      color: COLORS[Math.floor(random() * COLORS.length)],
      size: 7 + random() * 8,
      round: random() > 0.55,
    }));
  }, [active, pieces, seed, reducedMotion]);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {items.map((piece, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * (piece.round ? 1 : 1.6),
            backgroundColor: piece.color,
            borderRadius: piece.round ? "50%" : "2px",
            animation: `confetti-fall ${piece.duration}s cubic-bezier(0.3,0.6,0.4,1) ${piece.delay}s forwards`,
            ["--drift" as string]: `${piece.drift}px`,
            ["--spin" as string]: `${piece.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}

/** Star that flies from a source to the score counter when points are awarded. */
export function StarBurst({ show }: { show: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  if (!show || reducedMotion) return null;

  return (
    <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="absolute text-xl"
          style={{
            animation: `star-fly 0.9s var(--ease-out-soft) ${i * 0.05}s forwards`,
            ["--angle" as string]: `${i * 60}deg`,
          }}
        >
          ⭐
        </span>
      ))}
      <style>{`
        @keyframes star-fly {
          0% { transform: rotate(var(--angle)) translateY(0) scale(0.4); opacity: 0; }
          35% { opacity: 1; }
          100% { transform: rotate(var(--angle)) translateY(-90px) scale(1.1); opacity: 0; }
        }
      `}</style>
    </span>
  );
}
