# Design System

AlexOS looks like an operating system, never a website. When in doubt,
remove an element rather than add one.

## Source of truth

CSS custom properties in `apps/web/src/styles/globals.css` (`:root`) are
canonical. Tailwind consumes them via the standard shadcn/ui
`rgb(var(--x) / <alpha-value>)` indirection (`apps/web/tailwind.config.ts`).
`packages/config/src/theme.ts` mirrors the same values as typed constants
for plain JS/TS logic (Framer Motion durations, etc.) - keep both in sync
when a token changes.

## Color palette

| Token | Hex | Tailwind class |
|---|---|---|
| Background primary | `#09090B` | `bg-background-primary` |
| Background secondary | `#111113` | `bg-background-secondary` |
| Surface | `#18181B` | `bg-surface` |
| Surface hover | `#222226` | `bg-surface-hover` |
| Accent primary | `#3B82F6` | `bg-accent-primary` / `text-accent-primary` |
| Accent secondary | `#8B5CF6` | `bg-accent-secondary` |
| Success | `#22C55E` | `bg-success` |
| Warning | `#F59E0B` | `bg-warning` |
| Danger | `#EF4444` | `bg-danger` |
| Information | `#06B6D4` | `bg-information` |
| Text primary | `#FFFFFF` | `text-text-primary` |
| Text secondary | `#A1A1AA` | `text-text-secondary` |
| Border | `rgba(255,255,255,0.08)` | `border-border` |

Dark is the only theme shipped in the Foundation milestone; light is
scaffolded in `@alexos/hooks`' `useTheme` but not yet designed.

## Typography

Inter, falling back to the system UI font. Scale: Display (3rem), Heading
(2.25rem), Title (1.5rem), Subtitle (1.125rem), Body (1rem), Caption
(0.875rem) - as Tailwind font-size utilities `text-display` … `text-caption`.

## Radii

| Element | Radius | Tailwind class |
|---|---|---|
| Buttons | 14px | `rounded-button` |
| Cards | 20px | `rounded-card` |
| Dialogs | 24px | `rounded-dialog` |
| Widgets | 20px | `rounded-widget` |
| Dock | 999px | `rounded-dock` |

## Spacing

8, 12, 16, 20, 24, 32, 48, 64 - Tailwind spacing scale `1`–`8`. Never use
an arbitrary spacing value outside this scale.

## Motion

150ms / 200ms / 250ms, 350ms maximum, `ease-out` only, never a bounce.
Tailwind: `duration-fast` / `duration-base` / `duration-slow` / `duration-max`.
Page transitions fade and slide; nothing is ever abrupt.

## Icons

Material Symbols Rounded exclusively (loaded via Google Fonts in
`globals.css`). Never mix icon libraries. **Known limitation:** loading
the font from a CDN isn't offline-first; self-hosting it is a documented
future improvement, not done in the Foundation milestone.

## Touch targets

56×56px minimum, 64×64px ideal. The Dock's icons are exactly 56×56px
(`h-14 w-14`).

## States every Card must handle

Loading (skeleton, never an infinite spinner), Error (friendly copy,
optional retry - never raw technical detail like an HTTP status), Empty
(icon + message + optional action - never a blank space). See
`packages/ui/src/components/Card.tsx` for `CardLoading` / `CardError` /
`CardEmpty`.
