/** Capitalizes the first letter only; leaves the rest untouched. */
export function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Joins truthy class names, skipping falsy values - a minimal `clsx` alternative. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
