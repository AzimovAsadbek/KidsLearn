"use client";

/**
 * Last-resort boundary. It replaces the root layout, so it cannot rely on the
 * theme provider, fonts, app CSS variables or the i18n provider — everything
 * here is inline, and the locale is read straight from the cookie.
 */

const COPY = {
  en: {
    title: "Something went wrong",
    body: "KidsLearn hit an unexpected error. Trying again usually fixes it.",
    retry: "Try again",
    reference: "Reference",
  },
  uz: {
    title: "Nimadir xato ketdi",
    body: "KidsLearn kutilmagan xatoga duch keldi. Qayta urinish odatda yordam beradi.",
    retry: "Qayta urinish",
    reference: "Raqam",
  },
  ru: {
    title: "Что-то пошло не так",
    body: "KidsLearn столкнулся с неожиданной ошибкой. Обычно помогает повторная попытка.",
    retry: "Повторить",
    reference: "Код",
  },
} as const;

function cookieLocale(): keyof typeof COPY {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)kl-locale=(uz|ru|en)/);
    if (match) return match[1] as keyof typeof COPY;
  }
  return "en";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = cookieLocale();
  const copy = COPY[locale];

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#f4f5fb",
          color: "#14152b",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <main style={{ maxWidth: "26rem", textAlign: "center" }}>
          <div style={{ fontSize: "3.5rem", lineHeight: 1 }} aria-hidden>
            😕
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "1rem" }}>{copy.title}</h1>
          <p style={{ marginTop: "0.5rem", color: "#5c6084", lineHeight: 1.6 }}>{copy.body}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              height: "3rem",
              padding: "0 1.5rem",
              borderRadius: "1rem",
              border: "none",
              background: "#7c4dff",
              color: "#fff",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {copy.retry}
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#878cad" }}>
              {copy.reference}: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
