import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { cn } from "../lib/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

export interface DialogContentProps {
  title: string;
  description?: string;
  children?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

/** Centered, rounded, blurred backdrop. Minimal actions only - never overload a dialog. */
export function DialogContent({
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  className,
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 bg-background-primary/60 backdrop-blur-sm animate-in fade-in duration-base" />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 w-[min(480px,90vw)] -translate-x-1/2 -translate-y-1/2",
          "rounded-dialog bg-surface border border-border shadow-soft p-6",
          className,
        )}
      >
        <RadixDialog.Title className="text-title font-semibold text-text-primary">
          {title}
        </RadixDialog.Title>
        {description ? (
          <RadixDialog.Description className="mt-1 text-caption text-text-secondary">
            {description}
          </RadixDialog.Description>
        ) : null}
        {children ? <div className="mt-4 text-body text-text-primary">{children}</div> : null}
        {(primaryAction || secondaryAction) && (
          <div className="mt-6 flex items-center justify-end gap-3">
            {secondaryAction}
            {primaryAction}
          </div>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
