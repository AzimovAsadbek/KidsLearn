"use client";

import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, useT } from "@/i18n/provider";
import type { VoiceState } from "@/types";
import { useVoiceControl, type VoiceCommand } from "@/hooks/use-voice";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATE_TONE: Record<VoiceState, string> = {
  idle: "bg-primary-soft text-primary",
  listening: "bg-danger-soft text-danger",
  processing: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  error: "bg-danger-soft text-danger",
};

const STATE_KEY = {
  idle: "voice.idle",
  listening: "voice.listening",
  processing: "voice.processing",
  success: "voice.success",
  error: "voice.error",
} as const;

/**
 * The microphone is the whole control: one large target, five clearly different
 * states, and the state is always written out as well as animated.
 */
export function VoiceButton({
  state,
  onClick,
  size = 96,
  disabled,
  label,
}: {
  state: VoiceState;
  onClick: () => void;
  size?: number;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={state === "listening"}
      className={cn(
        "relative grid place-items-center rounded-full transition-transform duration-200",
        STATE_TONE[state],
        !disabled && "hover:scale-105 active:scale-95",
        disabled && "cursor-not-allowed opacity-50",
      )}
      style={{ width: size, height: size }}
    >
      {state === "listening" ? (
        <>
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-danger/30" aria-hidden />
          <span
            className="absolute inset-0 animate-pulse-ring rounded-full bg-danger/20"
            style={{ animationDelay: "0.6s" }}
            aria-hidden
          />
        </>
      ) : null}

      {state === "processing" ? (
        <span className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-current" aria-hidden />
      ) : null}

      {disabled ? (
        <MicOff style={{ width: size * 0.36, height: size * 0.36 }} aria-hidden />
      ) : (
        <Mic style={{ width: size * 0.36, height: size * 0.36 }} aria-hidden />
      )}
    </button>
  );
}

export function VoiceAssistantCard({ onCommand }: { onCommand?: (command: VoiceCommand) => void }) {
  const t = useT();
  const { intlLocale } = useI18n();
  const { state, transcript, supported, listen, stop } = useVoiceControl({
    lang: intlLocale,
    onCommand: (command) => onCommand?.(command),
  });

  const commands = [
    t("voice.cmdStart"),
    t("voice.cmdNext"),
    t("voice.cmdRepeat"),
    t("voice.cmdBack"),
    t("voice.cmdHelp"),
  ];

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span aria-hidden>🎤</span>
            {t("voice.assistant")}
          </span>
        }
        action={supported ? <Badge tone="mint" size="sm">{t("voice.ready")}</Badge> : <Badge tone="sky" size="sm">{t("voice.unavailable")}</Badge>}
      />
      <CardBody className="flex items-center gap-5">
        <VoiceButton
          state={state}
          disabled={!supported}
          label={t(STATE_KEY[state])}
          onClick={() => (state === "listening" ? stop() : listen())}
        />

        <div className="min-w-0 flex-1">
          <p className="t-body-sm font-bold text-content" role="status" aria-live="polite">
            {t(STATE_KEY[state])}
          </p>
          {transcript ? (
            <p className="t-caption mt-1 truncate text-content-secondary">&ldquo;{transcript}&rdquo;</p>
          ) : (
            <p className="t-caption mt-1 text-content-secondary">{t("voice.trySaying")}:</p>
          )}
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {commands.map((command) => (
              <li
                key={command}
                className="t-caption rounded-full bg-surface-muted px-2 py-0.5 font-semibold text-content-secondary"
              >
                &ldquo;{command}&rdquo;
              </li>
            ))}
          </ul>
          {!supported ? (
            <p className="t-caption mt-2 text-content-tertiary">
              This browser has no speech recognition — every action also has a button.
            </p>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
