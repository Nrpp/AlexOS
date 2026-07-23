import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card bg-surface border border-border shadow-soft p-6",
        className,
      )}
      {...props}
    />
  );
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  actions?: ReactNode;
}

export function CardHeader({ icon, actions, children, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)} {...props}>
      <div className="flex items-start gap-3">
        {icon ? <div className="text-accent-primary shrink-0">{icon}</div> : null}
        <div>{children}</div>
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-title font-semibold text-text-primary", className)} {...props} />;
}

export function CardSubtitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-caption text-text-secondary", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-body text-text-primary", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-4 pt-4 border-t border-border flex items-center justify-between", className)}
      {...props}
    />
  );
}

/** Skeleton loading state - never an infinite spinner, per the design system. */
export function CardLoading() {
  return (
    <div className="animate-pulse space-y-3" role="status" aria-label="Loading">
      <div className="h-4 w-2/3 rounded bg-surface-hover" />
      <div className="h-4 w-full rounded bg-surface-hover" />
      <div className="h-4 w-5/6 rounded bg-surface-hover" />
    </div>
  );
}

export interface CardErrorProps {
  message?: string;
  onRetry?: () => void;
}

/** Friendly, human error copy - never raw technical detail. */
export function CardError({ message = "We couldn't load this right now.", onRetry }: CardErrorProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="material-symbols-rounded text-3xl text-danger" aria-hidden>
        error
      </span>
      <p className="text-body text-text-secondary">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-caption text-accent-primary hover:underline"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export interface CardEmptyProps {
  icon?: string;
  message: string;
  action?: ReactNode;
}

/** Never a blank widget - every empty state carries an icon, a message, and an optional action. */
export function CardEmpty({ icon = "inbox", message, action }: CardEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="material-symbols-rounded text-3xl text-text-secondary" aria-hidden>
        {icon}
      </span>
      <p className="text-body text-text-secondary">{message}</p>
      {action}
    </div>
  );
}
