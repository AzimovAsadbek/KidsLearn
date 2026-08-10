"use client";

import { submitGameAttempt } from "@/lib/api/queries";

const STORAGE_KEY = "kl-pending-attempts";

interface PendingAttempt {
  clientAttemptId: string;
  childId: string;
  sessionId: string;
  durationSeconds: number;
  answers?: Array<{ questionId: string; selectedOptionId: string; correct: boolean }>;
  boardResult?: { moves: number; matchedPairs?: number; placedPieces?: number };
  queuedAt: number;
}

function read(): PendingAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingAttempt[]) : [];
  } catch {
    return [];
  }
}

function write(attempts: PendingAttempt[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    /* storage full or blocked; the attempt is simply lost rather than crashing */
  }
}

/**
 * Parks an attempt that could not be sent.
 *
 * Every attempt already carries a `clientAttemptId`, and the API treats that as
 * an idempotency key — so flushing a queue that partially succeeded can never
 * award XP twice.
 */
export function queueOfflineAttempt(attempt: Omit<PendingAttempt, "queuedAt">): void {
  const pending = read();
  if (pending.some((item) => item.clientAttemptId === attempt.clientAttemptId)) return;
  write([...pending, { ...attempt, queuedAt: Date.now() }]);
}

export function pendingAttemptCount(): number {
  return read().length;
}

/** Sends everything queued. Anything that fails again stays queued. */
export async function flushOfflineAttempts(): Promise<number> {
  const pending = read();
  if (pending.length === 0) return 0;

  const stillPending: PendingAttempt[] = [];
  let sent = 0;

  for (const attempt of pending) {
    try {
      await submitGameAttempt(attempt);
      sent += 1;
    } catch {
      stillPending.push(attempt);
    }
  }

  write(stillPending);
  return sent;
}

/** Flushes whenever the browser regains connectivity. */
export function registerOfflineSync(): () => void {
  const onOnline = () => void flushOfflineAttempts();
  window.addEventListener("online", onOnline);
  void flushOfflineAttempts();
  return () => window.removeEventListener("online", onOnline);
}
