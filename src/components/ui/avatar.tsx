import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import type { AvatarSpec } from "@/types";

const sizes = {
  xs: "h-7 w-7 text-sm rounded-[0.55rem]",
  sm: "h-9 w-9 text-base rounded-[0.7rem]",
  md: "h-11 w-11 text-xl rounded-md",
  lg: "h-14 w-14 text-2xl rounded-lg",
  xl: "h-20 w-20 text-4xl rounded-xl",
  "2xl": "h-28 w-28 text-6xl rounded-2xl",
} as const;

export type AvatarSize = keyof typeof sizes;

/**
 * Avatars are illustrated glyphs on a tinted tile — never photographs. This is a
 * deliberate child-safety choice as well as a visual one.
 */
export function Avatar({
  spec,
  size = "md",
  ring = false,
  className,
  label,
}: {
  spec: AvatarSpec;
  size?: AvatarSize;
  ring?: boolean;
  className?: string;
  label?: string;
}) {
  const tone = toneStyles[spec.tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center leading-none",
        sizes[size],
        tone.soft,
        ring && "ring-2 ring-surface outline outline-2 outline-primary/40",
        className,
      )}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="translate-y-[0.05em]">{spec.glyph}</span>
    </span>
  );
}

/** Overlapping stack with a "+N" overflow chip. */
export function AvatarGroup({
  specs,
  max = 4,
  size = "sm",
}: {
  specs: AvatarSpec[];
  max?: number;
  size?: AvatarSize;
}) {
  const shown = specs.slice(0, max);
  const overflow = specs.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((spec, i) => (
        <Avatar key={i} spec={spec} size={size} className="ring-2 ring-surface" />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            "inline-flex items-center justify-center bg-surface-muted font-semibold text-content-secondary ring-2 ring-surface",
            sizes[size],
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
