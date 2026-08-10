"use client";

import { useCallback, useRef } from "react";
import { useAppStore } from "@/store/app-store";

export type SoundName = "correct" | "wrong" | "tap" | "complete" | "star" | "levelUp";

/** Each cue is a tiny melody: [frequency Hz, start ms, duration ms]. */
const CUES: Record<SoundName, Array<[number, number, number]>> = {
  tap: [[520, 0, 70]],
  correct: [
    [660, 0, 110],
    [880, 90, 160],
  ],
  wrong: [
    [300, 0, 130],
    [220, 110, 180],
  ],
  star: [
    [880, 0, 80],
    [1175, 70, 90],
  ],
  complete: [
    [523, 0, 120],
    [659, 110, 120],
    [784, 220, 120],
    [1047, 330, 260],
  ],
  levelUp: [
    [440, 0, 100],
    [554, 90, 100],
    [659, 180, 100],
    [880, 280, 300],
  ],
};

/**
 * Feedback tones synthesised with the Web Audio API — no audio files to ship or
 * to fail offline, and it respects the child's sound toggle. The context is
 * created lazily on first play, which also satisfies browser autoplay rules.
 */
export function useSound() {
  const enabled = useAppStore((s) => s.soundEnabled);
  const contextRef = useRef<AudioContext | null>(null);

  return useCallback(
    (name: SoundName) => {
      if (!enabled || typeof window === "undefined") return;

      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        contextRef.current ??= new Ctor();
        const ctx = contextRef.current;
        if (ctx.state === "suspended") void ctx.resume();

        for (const [frequency, startMs, durationMs] of CUES[name]) {
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + startMs / 1000;
          const end = start + durationMs / 1000;

          oscillator.type = name === "wrong" ? "sawtooth" : "sine";
          oscillator.frequency.setValueAtTime(frequency, start);

          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.22, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, end);

          oscillator.connect(gain).connect(ctx.destination);
          oscillator.start(start);
          oscillator.stop(end + 0.02);
        }
      } catch {
        // Audio is an enhancement; a blocked or unsupported context must never
        // interrupt the lesson.
      }
    },
    [enabled],
  );
}

/**
 * Speech synthesis for "say it aloud" moments. Falls back silently where the
 * API is unavailable — the text is always on screen too.
 */
export function useSpeech() {
  const enabled = useAppStore((s) => s.soundEnabled);

  return useCallback(
    (text: string, lang = "en-US") => {
      if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.pitch = 1.15;
        window.speechSynthesis.speak(utterance);
      } catch {
        /* no-op */
      }
    },
    [enabled],
  );
}
