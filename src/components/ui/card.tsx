import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `flat` drops the shadow for cards nested inside another surface. */
  variant?: "raised" | "flat" | "outline";
  interactive?: boolean;
}

export function Card({ className, variant = "raised", interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface",
        variant === "raised" && "shadow-soft",
        variant === "flat" && "shadow-none",
        variant === "outline" && "bg-transparent shadow-none",
        interactive && "transition-shadow duration-200 hover:shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 pb-3 sm:px-6", className)}>
      <div className="min-w-0">
        {title ? <h3 className="t-h3 text-content">{title}</h3> : null}
        {subtitle ? <p className="t-body-sm mt-0.5 text-content-secondary">{subtitle}</p> : null}
        {children}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-3 border-t border-border px-5 py-4 sm:px-6", className)}
      {...props}
    />
  );
}

/**
 * A card whose header carries a control (range picker, legend) and whose body is
 * a chart. Used everywhere analytics appear so every chart frame matches.
 */
export function ChartCard({
  title,
  subtitle,
  action,
  footer,
  className,
  bodyClassName,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <CardBody className={cn("flex-1", bodyClassName)}>{children}</CardBody>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}

/** Section heading used between card groups on long pages. */
export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h2 className="t-h2 text-content">{title}</h2>
        {subtitle ? <p className="t-body-sm mt-1 text-content-secondary">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
