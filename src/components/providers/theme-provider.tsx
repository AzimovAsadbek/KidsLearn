"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ThemePreference } from "@/types";
import { THEME_COOKIE } from "@/lib/theme";

interface ThemeValue {
  preference: ThemePreference;
  /** What is actually on screen once "system" has been resolved. */
  resolved: "light" | "dark";
  setPreference: (next: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

/* ---------------------------------------------------------------------------
   The DOM is the source of truth for the resolved theme: the pre-paint script
   in <head> sets `.dark` before React ever runs. Reading it through
   useSyncExternalStore means the first client render already agrees with the
   screen, with no correcting effect and no flash.
   ------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Applies the preference to <html> and returns what is now displayed. */
function applyPreference(preference: ThemePreference): "light" | "dark" {
  const dark = preference === "dark" || (preference === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  notify();
  return dark ? "dark" : "light";
}

function subscribeToResolvedTheme(onChange: () => void) {
  listeners.add(onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  // Only "system" follows the OS; an explicit choice must win over it.
  const onSystemChange = () => {
    if (readPreferenceCookie() === "system") applyPreference("system");
    else onChange();
  };

  media.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onSystemChange);
  };
}

function readPreferenceCookie(): ThemePreference {
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : "system";
  return value === "light" || value === "dark" ? value : "system";
}

export function ThemeProvider({
  initialPreference,
  children,
}: {
  initialPreference: ThemePreference;
  children: ReactNode;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);

  const resolved = useSyncExternalStore(
    subscribeToResolvedTheme,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    // Server render: only an explicit "dark" cookie can be honoured here; the
    // pre-paint script resolves "system" before anything is visible.
    () => (initialPreference === "dark" ? "dark" : "light"),
  );

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    applyPreference(next);
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      preference,
      resolved,
      setPreference,
      toggle: () => setPreference(resolved === "dark" ? "light" : "dark"),
    }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
