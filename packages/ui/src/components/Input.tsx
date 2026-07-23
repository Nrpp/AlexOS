import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-14 w-full rounded-button border border-border bg-background-secondary px-4",
        "text-body text-text-primary placeholder:text-text-secondary",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        "transition-colors duration-base ease-out",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
