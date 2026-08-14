/**
 * Whether AlexOS should automatically switch dark/light theme at
 * sunset/sunrise. A tiny external store (not React state) so it can be
 * read and updated consistently from two independent places -
 * Settings' toggle and the AppShell-mounted controller that actually
 * applies it - without needing a context provider just for one boolean.
 * See useAutoTheme.ts for where this gets consumed.
 */

const STORAGE_KEY = "alexos.autoTheme";
const listeners = new Set<() => void>();

// On by default - this is a single-user personal device, and "just
// switch with the sun" is the behavior actually being asked for, not
// something to bury behind an opt-in.
const DEFAULT_ENABLED = true;

export function getAutoThemeEnabled(): boolean {
  if (typeof window === "undefined") return DEFAULT_ENABLED;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === null ? DEFAULT_ENABLED : stored === "true";
}

export function setAutoThemeEnabled(enabled: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, String(enabled));
  listeners.forEach((listener) => listener());
}

export function subscribeAutoThemeEnabled(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
