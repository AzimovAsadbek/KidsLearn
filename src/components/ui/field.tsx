"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-sm border bg-surface text-content placeholder:text-content-tertiary " +
  "transition-[border-color,box-shadow,background-color] duration-200 " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-content-tertiary";

const controlSize = "h-11 px-3.5 text-sm";

function stateRing(invalid?: boolean) {
  return invalid
    ? "border-danger focus:border-danger"
    : "border-border hover:border-border-strong focus:border-primary";
}

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/**
 * One wrapper owns label/hint/error wiring, so every control in the product gets
 * the same accessible relationships without repeating aria plumbing.
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <label htmlFor={id} className="t-label mb-1.5 block text-content">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error ? (
        <p id={errorId} role="alert" className="t-caption mt-1.5 flex items-center gap-1 font-medium text-danger">
          <span aria-hidden>⚠</span>
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="t-caption mt-1.5 text-content-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leadingIcon, trailingIcon, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        controlSize,
        stateRing(invalid),
        leadingIcon && "pl-10",
        trailingIcon && "pr-10",
        className,
      )}
      {...props}
    />
  );

  if (!leadingIcon && !trailingIcon) return input;

  return (
    <div className="relative">
      {leadingIcon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary">
          {leadingIcon}
        </span>
      ) : null}
      {input}
      {trailingIcon ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary">{trailingIcon}</span>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(controlBase, "resize-y px-3.5 py-3 text-sm", stateRing(invalid), className)}
        {...props}
      />
    );
  },
);

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          controlBase,
          controlSize,
          stateRing(invalid),
          "cursor-pointer appearance-none pr-9",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary"
        aria-hidden
      >
        ▾
      </span>
    </div>
  );
});

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-[0.35rem] border-2 border-border-strong text-primary accent-[var(--primary)]"
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer">
        <span className="t-body-sm font-medium text-content">{label}</span>
        {description ? <span className="t-caption block text-content-secondary">{description}</span> : null}
      </label>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-center justify-between gap-4", disabled && "opacity-60")}>
      <span className="min-w-0">
        <span className="t-body-sm block font-semibold text-content">{label}</span>
        {description ? <span className="t-caption block text-content-secondary">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-primary" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[1.4rem]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

/** Native date input with the product's control styling. */
export const DatePicker = forwardRef<HTMLInputElement, InputProps>(function DatePicker(props, ref) {
  return <Input ref={ref} type="date" {...props} />;
});
