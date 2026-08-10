import type { Locale } from "@/types";
import { en, type Dictionary, type LocaleDictionary, type TranslationKey } from "./dictionaries/en";
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

const dictionaries: Record<Locale, LocaleDictionary> = { en, uz, ru };

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

/**
 * Base names of the pluralised messages — every `plural.<name>.other` key in
 * the English dictionary. `.other` is the one CLDR category every language
 * has, so it doubles as the registry of available plural families.
 */
export type PluralBase = {
  [K in TranslationKey]: K extends `${infer B}.other` ? (B extends `plural.${string}` ? B : never) : never;
}[TranslationKey];

const pluralRulesCache = new Map<string, Intl.PluralRules>();

/**
 * Count-aware translation. Picks the CLDR plural category for the locale
 * (Russian needs one/few/many, Uzbek one/other) and resolves
 * `<base>.<category>`, falling back to `<base>.other`, then to English.
 * `{count}` is always available to the template.
 */
export function translatePlural(
  locale: Locale,
  base: PluralBase,
  count: number,
  values?: TranslateValues,
): string {
  const tag = localeMeta(locale).intl;
  let rules = pluralRulesCache.get(tag);
  if (!rules) {
    rules = new Intl.PluralRules(tag);
    pluralRulesCache.set(tag, rules);
  }
  const category = rules.select(count);
  const dict = dictionaries[locale];
  const exact = `${base}.${category}` as keyof LocaleDictionary;
  const other = `${base}.other` as TranslationKey;
  const template: string = dict?.[exact] ?? dict?.[other] ?? (en as LocaleDictionary)[exact] ?? en[other] ?? other;
  return template.replace(/\{(\w+)\}/g, (match: string, token: string) => {
    // values.count (e.g. a locale-formatted number) wins over the raw count.
    if (values && Object.hasOwn(values, token)) return String(values[token]);
    if (token === "count") return String(count);
    return match;
  });
}

export type { Dictionary, TranslationKey };
