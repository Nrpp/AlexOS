import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-button font-medium transition-colors duration-base ease-out disabled:pointer-events-none disabled:opacity-50 min-h-[56px] px-5",
  {
    variants: {
      variant: {
        primary: "bg-accent-primary text-text-primary hover:bg-accent-primary/90",
        secondary: "bg-surface text-text-primary hover:bg-surface-hover",
        danger: "bg-danger text-text-primary hover:bg-danger/90",
        ghost: "bg-transparent text-text-primary hover:bg-surface-hover",
        icon: "bg-surface text-text-primary hover:bg-surface-hover rounded-full aspect-square min-w-[56px] px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />
  ),
);
Button.displayName = "Button";
