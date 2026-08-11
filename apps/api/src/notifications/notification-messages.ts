/**
 * System notification copy in every supported locale.
 *
 * A notification row stores `messageKey` + `params`; the sentence a parent
 * sees is rendered here at read time in *their* locale, so one record serves
 * a Russian and an Uzbek parent equally. A param value may be a plain string
 * or a per-locale record (e.g. a lesson title snapshot in all three
 * languages), in which case the recipient's locale is picked with an English
 * fallback.
 */

export type MessageParamValue = string | number | Partial<Record<SupportedLocale, string>>;
export type MessageParams = Record<string, MessageParamValue>;
export type SupportedLocale = "en" | "uz" | "ru";

interface MessageTemplate {
  title: string;
  body: string;
}

const MESSAGES: Record<string, Record<SupportedLocale, MessageTemplate>> = {
  "achievement.earned": {
    en: { title: "{child} earned {achievement}", body: "{description}" },
    uz: { title: "{child} «{achievement}» yutug'ini qo'lga kiritdi", body: "{description}" },
    ru: { title: "{child} получает «{achievement}»", body: "{description}" },
  },
  "lesson.reminder": {
    en: { title: "Today's learning isn't finished", body: "{names}: today's goal is still open." },
    uz: { title: "Bugungi darslar hali tugamagan", body: "{names}: bugungi maqsad hali bajarilmagan." },
    ru: {
      title: "Сегодняшние занятия ещё не закончены",
      body: "{names}: сегодняшняя цель ещё не выполнена." },
  },
  "report.weekly": {
    en: { title: "Weekly report is ready", body: "This week: {minutes} min, {lessons} lessons, {stars} stars." },
    uz: { title: "Haftalik hisobot tayyor", body: "Bu hafta: {minutes} daqiqa, {lessons} ta dars, {stars} ta yulduz." },
    ru: {
      title: "Еженедельный отчёт готов",
      body: "За неделю: {minutes} мин, уроков: {lessons}, звёзд: {stars}." },
  },
  "streak.kept": {
    en: { title: "{child} kept a streak going", body: "Another day of learning in a row." },
    uz: { title: "{child} seriyani davom ettirdi", body: "Ketma-ket yana bir kunlik o'qish." },
    ru: {
      title: "{child} Ð¿ÑÐ¾Ð´Ð¾Ð»Ð¶Ð°ÐµÑ ÑÐµÑÐ¸Ñ",
      body: "ÐÑÑ Ð¾Ð´Ð¸Ð½ ÑÑÐµÐ±Ð½ÑÐ¹ Ð´ÐµÐ½Ñ Ð¿Ð¾Ð´ÑÑÐ´." },
  },
  "lesson.new": {
    en: { title: "New lesson added", body: "“{lessonTitle}” is now available." },
    uz: { title: "Yangi dars qo'shildi", body: "“{lessonTitle}” darsi endi mavjud." },
    ru: {
      title: "Добавлен новый урок",
      body: "Урок «{lessonTitle}» уже доступен." },
  },
};

function normalizeLocale(locale: string): SupportedLocale {
  const lower = locale.toLowerCase().slice(0, 2);
  return lower === "uz" || lower === "ru" ? lower : "en";
}

function resolveParam(value: MessageParamValue, locale: SupportedLocale): string {
  if (typeof value === "object" && value !== null) {
    return value[locale] ?? value.en ?? Object.values(value)[0] ?? "";
  }
  return String(value);
}

/**
 * Returns the rendered title/body for a message key in the given locale, or
 * null for unknown keys so callers can fall back to the stored copy.
 */
export function renderNotificationMessage(
  locale: string,
  messageKey: string,
  params: MessageParams | null | undefined,
): MessageTemplate | null {
  const templates = MESSAGES[messageKey];
  if (!templates) return null;

  const resolved = normalizeLocale(locale);
  const template = templates[resolved] ?? templates.en;
  const substitute = (text: string) =>
    text.replace(/\{(\w+)\}/g, (match, token: string) => {
      const value = params?.[token];
      return value === undefined ? match : resolveParam(value, resolved);
    });

  return { title: substitute(template.title), body: substitute(template.body) };
}
