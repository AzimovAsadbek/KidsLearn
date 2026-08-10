"use client";

/**
 * Last-resort boundary. It replaces the root layout, so it cannot rely on the
 * theme provider, fonts or any app CSS variables — everything here is inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
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
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "1rem" }}>Something went wrong</h1>
          <p style={{ marginTop: "0.5rem", color: "#5c6084", lineHeight: 1.6 }}>
            KidsLearn hit an unexpected error. Trying again usually fixes it.
          </p>
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
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#878cad" }}>Reference: {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
