"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "soft"
  | "danger"
  | "success"
  /** Oversized, high-contrast, tactile — child-facing surfaces only. */
  | "kid";

export type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon" | "icon-sm" | "icon-lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none " +
  "transition-[background-color,color,box-shadow,transform,opacity] duration-200 " +
  "disabled:pointer-events-none disabled:opacity-50 active:translate-y-px";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-on shadow-soft hover:bg-primary-hover hover:shadow-card",
  secondary: "bg-surface text-content border border-border shadow-soft hover:bg-surface-muted hover:border-border-strong",
  outline: "border border-border-strong text-content hover:bg-surface-muted",
  ghost: "text-content-secondary hover:bg-surface-muted hover:text-content",
  soft: "bg-primary-soft text-primary hover:bg-primary-soft-strong",
  danger: "bg-danger text-white shadow-soft hover:brightness-110",
  success: "bg-success text-white shadow-soft hover:brightness-110",
  kid: "bg-primary text-primary-on shadow-[0_6px_0_0_var(--color-brand-700)] hover:shadow-[0_8px_0_0_var(--color-brand-700)] active:shadow-[0_2px_0_0_var(--color-brand-700)] active:translate-y-1",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-xs px-3 text-[0.8125rem]",
  md: "h-11 rounded-sm px-4 text-sm",
  lg: "h-12 rounded-md px-6 text-[0.9375rem]",
  xl: "h-14 rounded-lg px-8 text-base",
  icon: "h-11 w-11 rounded-sm",
  "icon-sm": "h-9 w-9 rounded-xs",
  "icon-lg": "h-12 w-12 rounded-md",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    leadingIcon,
    trailingIcon,
    fullWidth,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});

/** Anchor styled as a button — keeps navigation semantics intact. */
export function ButtonLink({
  href,
  className,
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  fullWidth,
  children,
  ...props
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Compact icon-only control used across headers and table rows. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { label: string }>(
  function IconButton({ label, size = "icon", variant = "ghost", className, children, ...props }, ref) {
    return (
      <Button
        ref={ref}
        size={size}
        variant={variant}
        aria-label={label}
        title={label}
        className={cn("shrink-0", className)}
        {...props}
      >
        {children}
      </Button>
    );
  },
);
