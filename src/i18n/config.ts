import type { Locale } from "@/types";
import { en, type Dictionary, type TranslationKey } from "./dictionaries/en";
import { ru } from "./dictionaries/ru";
import { uz } from "./dictionaries/uz";

export interface LocaleMeta {
  code: Locale;
  /** Endonym — always shown in the language's own script. */
  label: string;
  englishLabel: string;
  flag: string;
  /** BCP-47 tag for Intl formatting. */
  intl: string;
}

export const LOCALES: readonly LocaleMeta[] = [
  { code: "uz", label: "O'zbekcha", englishLabel: "Uzbek", flag: "🇺🇿", intl: "uz-UZ" },
  { code: "en", label: "English", englishLabel: "English", flag: "🇬🇧", intl: "en-US" },
  { code: "ru", label: "Русский", englishLabel: "Russian", flag: "🇷🇺", intl: "ru-RU" },
] as const;

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "kl-locale";

const dictionaries: Record<Locale, Partial<Dictionary>> = { en, uz, ru };

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "uz" || value === "ru";
}

export function localeMeta(locale: Locale): LocaleMeta {
  return LOCALES.find((l) => l.code === locale) ?? LOCALES[1];
}

export type TranslateValues = Record<string, string | number>;

/**
 * Resolve a key for a locale, falling back to English so a missing translation
 * degrades to readable copy instead of an exposed key.
 */
export function translate(locale: Locale, key: TranslationKey, values?: TranslateValues): string {
  const template = dictionaries[locale]?.[key] ?? en[key] ?? key;
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    Object.hasOwn(values, token) ? String(values[token]) : match,
  );
}

export type { Dictionary, TranslationKey };
