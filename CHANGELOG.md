# Changelog

All notable changes to AlexOS are documented in this file.

## [Unreleased]

### Added

- Module contract extended: `on_load(event_bus, config)` now also
  receives the module's parsed `config.json` (`{}` if missing/invalid) -
  `clock`'s tick interval is now configurable instead of hardcoded.
- Weather module (`modules/weather`): mocked reading, `weather.updated`
  event, powers Home's Weather card.
- Calendar module (`modules/calendar`): events seeded from `config.json`,
  powers Home's "Today's calendar" card.
- Tasks module (`modules/tasks`): in-memory tasks, inline add/complete,
  `task.created`/`task.completed` events, powers Home's "Today's tasks"
  card and the Quick Actions "Add task" button.
- Servers module (`modules/servers`): simulated CPU/RAM/disk/temperature,
  `server.metrics` event, powers the Servers page.
- Study module (`modules/study`): Pomodoro timer, fully client-side, no
  backend - proves a module can be frontend-only. Powers the Study page.
- Network module (`modules/network`): simulated devices/bandwidth/
  latency/IPs, `network.updated` event. Powers the Network page.
- Communication module (`modules/communication`): mock inbox, simulated
  new mail arriving over time, `mail.received` event. Powers the
  Communication page.
- Media module (`modules/media`): mock player with real play/pause/skip/
  previous controls and a live progress bar, `media.updated` event.
  Powers the Media page.
- Room module (`modules/room`): in-memory lights with per-light toggles
  and Focus/Sleep/Morning scenes, `room.updated` event. Powers the Room page.
- `ModuleWidgetPage` (`apps/web/src/components/ModuleWidgetPage.tsx`):
  shared "page is one module's widget, or an honest empty state"
  component, replacing per-page duplication.
- Widget prop contract extended with `apiBaseUrl` alongside `eventBus`,
  for widgets that need an initial REST read or to write data back.
- Main content area widened to 90rem (`apps/web/src/layout/AppShell.tsx`).

### Removed

- AI module (`modules/ai`) and its page - a scripted keyword matcher
  wasn't worth keeping as a placeholder for "AI."
- Finance module (`modules/finance`) and its page.
- Vehicle page - never had a module; the spec never actually details
  what it should contain (Part 2 lists it, Part 5 never describes it).

### Fixed

- **Critical, app-wide:** `tailwind.config.ts` redefined spacing keys
  `1`-`8` to the design system's pixel scale (`{1: "8px", ... 8: "64px"}`),
  which collided with Tailwind's own built-in keys `1`-`8` (`7` normally
  means 28px, not 48px, etc.) and silently corrupted every `p-*`/`m-*`/
  `gap-*`/`w-*`/`h-*`/`translate-*` utility using those key numbers with
  their standard Tailwind meaning - nearly every component in the app,
  since Tailwind classes were written assuming normal semantics. Removed
  the override entirely; Tailwind's default scale already produces the
  same pixel values at different (non-colliding) key numbers. See
  `docs/DESIGN_SYSTEM.md`'s Spacing section for the correct mapping and
  why not to reintroduce this.
- `Toggle` (`packages/ui/src/components/Toggle.tsx`): redesigned with a
  bordered track, a shadowed thumb, and keyboard focus styling, now that
  its dimensions are no longer corrupted by the bug above.
- Settings' dark-theme toggle silently did nothing when switched to
  "light" (no light theme exists yet) - now disabled with honest copy
  instead of looking broken.

## [0.0.1] - Foundation

### Added

- Monorepo structure (`apps/`, `packages/`, `modules/`, `docker/`, `docs/`, `scripts/`).
- AlexOS Core: Event Bus, Module Manager, Configuration Manager, Storage
  Manager, Notification Manager.
- FastAPI backend with a versioned REST API (`/api/v1`) and a WebSocket
  event stream.
- React + Vite + TypeScript frontend shell: Status Bar, floating Dock,
  Notifications and Dialogs layers, page router.
- Design-token system (color palette, typography, spacing, radii,
  animation durations) shared between Tailwind and application code.
- Widget framework and one reference module (`clock`) proving end-to-end
  module auto-discovery on both frontend and backend.
- Placeholder pages for every planned section: Home, Study, Servers,
  Network, Communication, Media, AI, Room, Finance, Vehicle, Settings.
- Docker Compose for development (hot reload) and production
  (`docker compose up -d`).
