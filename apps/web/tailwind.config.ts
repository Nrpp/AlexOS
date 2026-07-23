import type { Config } from "tailwindcss";

/**
 * Colors and radii reference the CSS custom properties in
 * src/styles/globals.css (single source of truth), following the
 * standard shadcn/ui `rgb(var(--x) / <alpha-value>)` indirection so
 * themes can be swapped by changing CSS variables alone.
 */
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../modules/*/frontend/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "background-primary": "rgb(var(--background-primary) / <alpha-value>)",
        "background-secondary": "rgb(var(--background-secondary) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-hover": "rgb(var(--surface-hover) / <alpha-value>)",
        "accent-primary": "rgb(var(--accent-primary) / <alpha-value>)",
        "accent-secondary": "rgb(var(--accent-secondary) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        information: "rgb(var(--information) / <alpha-value>)",
        "text-primary": "rgb(var(--text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        // Already translucent per the design system - not an opacity-modifiable token.
        border: "var(--border)",
      },
      borderRadius: {
        button: "var(--radius-button)",
        card: "var(--radius-card)",
        dialog: "var(--radius-dialog)",
        widget: "var(--radius-widget)",
        dock: "var(--radius-dock)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: "3rem",
        heading: "2.25rem",
        title: "1.5rem",
        subtitle: "1.125rem",
        body: "1rem",
        caption: "0.875rem",
      },
      spacing: {
        1: "8px",
        2: "12px",
        3: "16px",
        4: "20px",
        5: "24px",
        6: "32px",
        7: "48px",
        8: "64px",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "250ms",
        max: "350ms",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
