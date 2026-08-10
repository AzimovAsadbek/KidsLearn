"use client";

import { cn } from "@/lib/utils";

export type MascotMood = "happy" | "cheer" | "think" | "sleepy" | "oops";

/**
 * Leo — the KidsLearn mascot. Drawn inline as SVG so he scales to any surface,
 * theme-adapts, and costs no network request on a child's first paint.
 */
export function Mascot({
  mood = "happy",
  size = 180,
  className,
  float = true,
}: {
  mood?: MascotMood;
  size?: number;
  className?: string;
  float?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={cn(float && "animate-float", className)}
      role="img"
      aria-label={`Leo the lion, looking ${mood}`}
    >
      <defs>
        <radialGradient id="leo-mane" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#FFB93D" />
          <stop offset="100%" stopColor="#F08A1E" />
        </radialGradient>
        <linearGradient id="leo-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFDCA8" />
          <stop offset="100%" stopColor="#FFC978" />
        </linearGradient>
      </defs>

      {/* Mane — twelve rounded petals around the face */}
      <g>
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          // Rounded so the server and client serialise byte-identical attributes;
          // raw floats differ in their last digit and trip a hydration mismatch.
          const cx = Math.round((100 + Math.cos(angle) * 58) * 100) / 100;
          const cy = Math.round((100 + Math.sin(angle) * 58) * 100) / 100;
          return <circle key={i} cx={cx} cy={cy} r="26" fill="url(#leo-mane)" />;
        })}
        <circle cx="100" cy="100" r="62" fill="#FFA92E" />
      </g>

      {/* Ears */}
      <circle cx="58" cy="62" r="15" fill="#F08A1E" />
      <circle cx="58" cy="62" r="8" fill="#FFB07C" />
      <circle cx="142" cy="62" r="15" fill="#F08A1E" />
      <circle cx="142" cy="62" r="8" fill="#FFB07C" />

      {/* Face */}
      <circle cx="100" cy="102" r="50" fill="url(#leo-face)" />

      {/* Eyes */}
      {mood === "sleepy" ? (
        <>
          <path d="M74 96q9 8 18 0" stroke="#4A2C12" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M108 96q9 8 18 0" stroke="#4A2C12" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </>
      ) : mood === "cheer" ? (
        <>
          <path d="M74 100q9-11 18 0" stroke="#4A2C12" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M108 100q9-11 18 0" stroke="#4A2C12" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="83" cy="96" rx="7.5" ry="9" fill="#3D2410" />
          <ellipse cx="117" cy="96" rx="7.5" ry="9" fill="#3D2410" />
          <circle cx="85.5" cy="92.5" r="2.6" fill="#fff" />
          <circle cx="119.5" cy="92.5" r="2.6" fill="#fff" />
        </>
      )}

      {/* Brows convey the thinking / oops moods */}
      {mood === "think" ? (
        <>
          <path d="M74 82q9-6 18-2" stroke="#B4630F" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M108 80h18" stroke="#B4630F" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : null}
      {mood === "oops" ? (
        <>
          <path d="M74 80q9 4 18 2" stroke="#B4630F" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M108 82q9-4 18-2" stroke="#B4630F" strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      ) : null}

      {/* Muzzle */}
      <ellipse cx="100" cy="120" rx="24" ry="18" fill="#FFF0D6" />
      <path d="M100 110l-8 6 8 6 8-6z" fill="#C9622A" />

      {/* Mouth */}
      {mood === "oops" ? (
        <ellipse cx="100" cy="130" rx="7" ry="6" fill="#C9622A" />
      ) : mood === "think" ? (
        <path d="M92 130h14" stroke="#C9622A" strokeWidth="4" strokeLinecap="round" />
      ) : (
        <path
          d={mood === "cheer" ? "M86 126q14 16 28 0" : "M88 127q12 11 24 0"}
          stroke="#C9622A"
          strokeWidth="4"
          strokeLinecap="round"
          fill={mood === "cheer" ? "#C9622A" : "none"}
        />
      )}

      {/* Whiskers */}
      <g stroke="#E0A96D" strokeWidth="2.5" strokeLinecap="round">
        <path d="M68 116h-14" />
        <path d="M68 124l-13 5" />
        <path d="M132 116h14" />
        <path d="M132 124l13 5" />
      </g>

      {/* Cheeks */}
      <ellipse cx="70" cy="114" rx="8" ry="5" fill="#FF9F9F" opacity="0.5" />
      <ellipse cx="130" cy="114" rx="8" ry="5" fill="#FF9F9F" opacity="0.5" />
    </svg>
  );
}

/** Small speech bubble the mascot uses to guide a child through a screen. */
export function MascotSays({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-border bg-surface px-4 py-3 shadow-soft",
        "before:absolute before:-bottom-2 before:left-8 before:h-4 before:w-4 before:rotate-45 before:border-b-2 before:border-r-2 before:border-border before:bg-surface",
        className,
      )}
    >
      <p className="t-body font-semibold text-content">{children}</p>
    </div>
  );
}
