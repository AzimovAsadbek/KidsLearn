"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "@/types";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  localeMeta,
  translate,
  translatePlural,
  type PluralBase,
  type TranslateValues,
  type TranslationKey,
} from "./config";

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: TranslateValues) => string;
  /** Count-aware translation using the locale's CLDR plural categories. */
  plural: (base: PluralBase, count: number, values?: TranslateValues) => string;
  /** BCP-47 tag for Intl.NumberFormat / DateTimeFormat call sites. */
  intlLocale: string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    // A cookie (not localStorage) so the server render already knows the language
    // and there is no flash of English on the next navigation.
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, values) => translate(locale, key, values),
      plural: (base, count, values) => translatePlural(locale, base, count, values),
      intlLocale: localeMeta(locale).intl,
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Rendering outside the provider is a wiring bug, but returning a working
    // English translator keeps a stray component from blanking the whole page.
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => undefined,
      t: (key, values) => translate(DEFAULT_LOCALE, key, values),
      plural: (base, count, values) => translatePlural(DEFAULT_LOCALE, base, count, values),
      intlLocale: "en-US",
    };
  }
  return ctx;
}

/** Convenience hook when a component only needs the translator. */
export function useT() {
  return useI18n().t;
}
