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
        "relative h-8 w-14 shrink-0 rounded-dock bg-surface-hover transition-colors duration-base ease-out",
        "data-[state=checked]:bg-accent-primary",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          "block h-6 w-6 translate-x-1 rounded-full bg-text-primary transition-transform duration-base ease-out",
          "data-[state=checked]:translate-x-7",
        )}
      />
    </RadixSwitch.Root>
  );
}
