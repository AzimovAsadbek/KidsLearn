import { Locale as PrismaLocale } from "@kidslearn/database";
import { Locale } from "@kidslearn/types";

/**
 * The database stores locales as an uppercase enum; the API contract uses the
 * BCP-47-ish lowercase codes the web app already speaks. These two functions
 * are the only place that translation happens.
 */
export function toApiLocale(locale: PrismaLocale): Locale {
  switch (locale) {
    case "UZ":
      return Locale.UZ;
    case "RU":
      return Locale.RU;
    default:
      return Locale.EN;
  }
}

export function toPrismaLocale(locale: Locale | string | undefined): PrismaLocale {
  switch ((locale ?? "en").toLowerCase()) {
    case "uz":
      return PrismaLocale.UZ;
    case "ru":
      return PrismaLocale.RU;
    default:
      return PrismaLocale.EN;
  }
}

/**
 * Picks the best translation available.
 *
 * Falls back to English, then to whatever exists, so a half-translated lesson
 * still renders instead of showing an empty title.
 */
export function pickTranslation<T extends { locale: PrismaLocale }>(
  translations: T[],
  preferred: PrismaLocale,
): T | undefined {
  return (
    translations.find((t) => t.locale === preferred) ??
    translations.find((t) => t.locale === PrismaLocale.EN) ??
    translations[0]
  );
}
