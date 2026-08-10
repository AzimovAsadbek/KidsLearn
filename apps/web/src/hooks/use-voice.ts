"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { VoiceState } from "@/types";

/** Commands the assistant understands, mapped to the phrases that trigger them. */
export const VOICE_COMMANDS = {
  start: ["start", "start lesson", "begin", "boshla", "начать", "начни"],
  next: ["next", "continue", "keyingi", "дальше", "далее"],
  repeat: ["repeat", "again", "takrorla", "повтори"],
  back: ["back", "go back", "orqaga", "назад"],
  help: ["help", "yordam", "помощь"],
} as const;

export type VoiceCommand = keyof typeof VOICE_COMMANDS;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function recognitionConstructor(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function getRecognition(): SpeechRecognitionLike | null {
  const Ctor = recognitionConstructor();
  return Ctor ? new Ctor() : null;
}

/** Capability detection is static for the lifetime of the page — never resubscribes. */
const neverChanges = () => () => undefined;

function matchCommand(transcript: string): VoiceCommand | null {
  const text = transcript.toLowerCase().trim();
  for (const [command, phrases] of Object.entries(VOICE_COMMANDS) as Array<[VoiceCommand, readonly string[]]>) {
    if (phrases.some((phrase) => text.includes(phrase))) return command;
  }
  return null;
}

/**
 * Voice control over the Web Speech API. The UI is always usable without it —
 * `supported` lets callers present the assistant as an optional aid rather than
 * a broken feature on browsers that lack recognition.
 */
export function useVoiceControl({
  lang = "en-US",
  onCommand,
}: {
  lang?: string;
  onCommand?: (command: VoiceCommand, transcript: string) => void;
} = {}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const resetTimer = useRef<number | null>(null);

  // Read on first client render rather than corrected afterwards, so the button
  // never appears and then disappears.
  const supported = useSyncExternalStore(
    neverChanges,
    () => recognitionConstructor() !== undefined,
    () => false,
  );

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      recognitionRef.current?.stop();
    },
    [],
  );

  const settle = useCallback((next: VoiceState) => {
    setState(next);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setState("idle"), 1800);
  }, []);

  const listen = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) {
      settle("error");
      return;
    }

    recognitionRef.current = recognition;
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const heard = event.results[0]?.[0]?.transcript ?? "";
      setTranscript(heard);
      setState("processing");
      const command = matchCommand(heard);
      if (command) {
        onCommand?.(command, heard);
        settle("success");
      } else {
        settle("error");
      }
    };
    recognition.onerror = () => settle("error");
    recognition.onend = () => setState((current) => (current === "listening" ? "idle" : current));

    setState("listening");
    setTranscript("");
    try {
      recognition.start();
    } catch {
      settle("error");
    }
  }, [lang, onCommand, settle]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState("idle");
  }, []);

  return { state, transcript, supported, listen, stop };
}
