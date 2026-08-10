"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tooltip that opens on hover *and* focus, so keyboard users get the same hint.
 * Content is always supplementary — never the only place information exists.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const position = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side];

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "pointer-events-none absolute z-50 w-max max-w-56 rounded-sm bg-surface-inverse px-2.5 py-1.5 text-center text-xs font-medium text-content-inverse shadow-pop",
            "animate-fade-in",
            position,
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
