import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "../lib/cn";

export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Toggle({ checked, onCheckedChange, disabled, label, className }: ToggleProps) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-dock border border-border",
        "bg-background-secondary transition-colors duration-base ease-out",
        "data-[state=checked]:border-accent-primary data-[state=checked]:bg-accent-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary",
        "disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 translate-x-1 rounded-full bg-text-primary shadow-soft",
          "transition-transform duration-base ease-out",
          "data-[state=checked]:translate-x-6",
        )}
      />
    </RadixSwitch.Root>
  );
}
