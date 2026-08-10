"use client";

import { useRouter } from "next/navigation";
import { useI18n, useT } from "@/i18n/provider";
import { useVoiceControl } from "@/hooks/use-voice";
import { VoiceButton } from "./voice-assistant-card";

const STATE_KEY = {
  idle: "voice.idle",
  listening: "voice.listening",
  processing: "voice.processing",
  success: "voice.success",
  error: "voice.error",
} as const;

/**
 * The child-facing voice affordance: one big microphone with the state written
 * underneath it. Hidden entirely where the browser has no recognition, rather
 * than shown as a button that does nothing.
 */
export function KidVoiceHelper() {
  const t = useT();
  const { intlLocale } = useI18n();
  const router = useRouter();

  const voice = useVoiceControl({
    lang: intlLocale,
    onCommand: (command) => {
      if (command === "start") router.push("/kids/lessons");
      if (command === "next") router.push("/kids/games");
      if (command === "back") router.back();
      if (command === "help") router.push("/kids");
    },
  });

  if (!voice.supported) return null;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <VoiceButton
        state={voice.state}
        size={64}
        label={t("voice.assistant")}
        onClick={() => (voice.state === "listening" ? voice.stop() : voice.listen())}
      />
      <p className="t-caption max-w-24 text-center font-bold text-content-secondary" role="status" aria-live="polite">
        {t(STATE_KEY[voice.state])}
      </p>
    </div>
  );
}
