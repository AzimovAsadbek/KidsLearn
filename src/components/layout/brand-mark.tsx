import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The KidsLearn logo: a rounded "graduation block" glyph plus the wordmark.
 * Drawn as SVG so it stays crisp at every size and inherits the theme.
 */
export function BrandGlyph({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="12" fill="url(#kl-brand)" />
      <path d="M20 10.5 L30.5 16 L20 21.5 L9.5 16 Z" fill="white" fillOpacity="0.96" />
      <path
        d="M13.5 18.6v4.9c0 2.6 2.9 4.4 6.5 4.4s6.5-1.8 6.5-4.4v-4.9"
        stroke="white"
        strokeOpacity="0.9"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="30.5" cy="16" r="1.9" fill="#FFD166" />
      <defs>
        <linearGradient id="kl-brand" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9C7CFF" />
          <stop offset="1" stopColor="#6D3FF0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandMark({
  compact = false,
  variant = "parent",
  href,
  className,
}: {
  compact?: boolean;
  variant?: "parent" | "admin" | "kid" | "plain";
  href?: string;
  className?: string;
}) {
  const target = href ?? (variant === "admin" ? "/admin" : variant === "kid" ? "/kids" : "/dashboard");

  return (
    <Link href={target} className={cn("flex items-center gap-2.5 rounded-sm", className)}>
      <BrandGlyph size={compact ? 34 : 32} />
      {!compact ? (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              "font-display text-lg font-extrabold tracking-tight",
              variant === "admin" ? "text-sidebar-fg-active" : "text-content",
            )}
          >
            Kids<span className="text-primary">Learn</span>
          </span>
          {variant === "admin" ? (
            <span className="t-overline mt-0.5 text-sidebar-section">Admin</span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}
