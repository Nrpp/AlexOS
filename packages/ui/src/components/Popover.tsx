import type { ReactNode } from "react";
import * as RadixPopover from "@radix-ui/react-popover";
import { cn } from "../lib/cn";

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;

export interface PopoverContentProps {
  children: ReactNode;
  className?: string;
}

/** An anchored panel (Notifications, Quick Settings) - lighter-weight
 * than a centered Dialog, for content tied to the control that opened it. */
export function PopoverContent({ children, className }: PopoverContentProps) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={8}
        align="end"
        className={cn(
          "z-50 w-80 rounded-card border border-border bg-surface p-4 shadow-soft",
          className,
        )}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
}
