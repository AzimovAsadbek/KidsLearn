import { Mascot } from "./mascot";

/**
 * The child-facing loading state. A skeleton grid reads as "broken" to a
 * four-year-old, so Leo waits with them instead.
 */
export function KidLoading({ message = "Getting things ready…" }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center" aria-busy="true">
      <Mascot size={140} mood="happy" />
      <p className="font-display text-xl font-extrabold text-content" role="status">
        {message}
      </p>
      <div className="flex gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-full bg-primary"
            style={{ animation: `kid-dot 1s ${i * 0.16}s infinite ease-in-out` }}
          />
        ))}
      </div>
      <style>{`
        @keyframes kid-dot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
