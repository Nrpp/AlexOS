/**
 * AlexOS design tokens.
 *
 * The rendering source of truth is the set of CSS custom properties in
 * `apps/web/src/styles/globals.css` (consumed by Tailwind via the
 * `hsl(var(--x))` indirection, per the shadcn/ui pattern). This file mirrors
 * the same values as typed constants for use in plain JS/TS logic where a
 * CSS variable can't be read directly - Framer Motion transition durations,
 * canvas/chart colors, etc. Keep the two in sync when a token changes.
 */

export const colors = {
  backgroundPrimary: "#09090B",
  backgroundSecondary: "#111113",
  surface: "#18181B",
  surfaceHover: "#222226",
  accentPrimary: "#3B82F6",
  accentSecondary: "#8B5CF6",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  information: "#06B6D4",
  textPrimary: "#FFFFFF",
  textSecondary: "#A1A1AA",
  border: "rgba(255, 255, 255, 0.08)",
} as const;

export const typography = {
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  scale: {
    display: "3rem",
    heading: "2.25rem",
    title: "1.5rem",
    subtitle: "1.125rem",
    body: "1rem",
    caption: "0.875rem",
  },
} as const;

export const radii = {
  button: "14px",
  card: "20px",
  dialog: "24px",
  widget: "20px",
  dock: "999px",
} as const;

/**
 * Consistent spacing scale. Never use arbitrary spacing outside of this.
 *
 * These are values, not Tailwind key numbers - Tailwind's own default
 * scale already produces every one of them (at `key * 0.25rem`), so
 * Tailwind classes use its standard keys directly: p-2 (8px), p-3
 * (12px), p-4 (16px), p-5 (20px), p-6 (24px), p-8 (32px), p-12 (48px),
 * p-16 (64px). A tailwind.config.ts `spacing` override once redefined
 * keys 1-8 to these same values, which silently collided with
 * Tailwind's own keys 1-8 (different values) and corrupted sizing
 * everywhere those keys were used with their normal Tailwind meaning -
 * removed for that reason. Don't reintroduce it.
 */
export const spacing = [8, 12, 16, 20, 24, 32, 48, 64] as const;

export const motion = {
  durationFast: 150,
  durationBase: 200,
  durationSlow: 250,
  durationMax: 350,
  easing: "ease-out",
} as const;

export const touchTargets = {
  minimum: 56,
  ideal: 64,
} as const;

export const theme = {
  colors,
  typography,
  radii,
  spacing,
  motion,
  touchTargets,
} as const;

export type Theme = typeof theme;
