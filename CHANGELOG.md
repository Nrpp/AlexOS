# Changelog

All notable changes to AlexOS are documented in this file.

## [Unreleased]

### Added

- Real, fully-functional light theme (`apps/web/src/styles/globals.css`'s
  `:root[data-theme="light"]` block) - Settings' dark-theme toggle now
  actually switches themes instead of being disabled.
- Status Bar (`apps/web/src/layout/StatusBar/StatusBar.tsx`) is now fully
  wired instead of showing static placeholders:
  - Weather indicator reads live `weather.updated` data off the Event Bus.
  - Notifications button opens a real popover (`packages/ui`'s new
    `Popover` primitive, wrapping Radix) listing persisted notifications
    from the new `GET /api/v1/notifications` endpoint.
  - Quick Settings button opens a popover with a working dark/light theme
    toggle and a link to the full Settings page.
- `apps/api/app/core/notification_rules.py`: Core-level rules that turn
  raw module events into real notifications - currently `mail.received`
  → an "information" notification - registered once in `main.py`, no
  module needs to know notifications exist.
- Event Bus (`apps/api/app/core/event_bus.py`) gained an opt-in
  `retain: bool` parameter and `get_all_last()`, so newly-connected
  WebSocket clients immediately receive the most recent "current state"
  event (`weather.updated`, `server.metrics`, `network.updated`,
  `media.updated`) instead of waiting for the next tick. Deliberately
  **not** applied to one-time action events (`mail.received`,
  `notification.created`, `task.created`/`completed`) or to
  `room.updated` (its two publishers currently emit inconsistent payload
  shapes) to avoid replaying stale toasts on reconnect.
- Weather module (`modules/weather`) now uses **real data** from
  Open-Meteo (no API key required) instead of a mock provider - edit
  `modules/weather/config.json`'s `latitude`/`longitude` to your location.
- Room module (`modules/room`) now uses **real data** from a Home
  Assistant instance instead of in-memory lights - the first module to
  read a secret (`HA_BASE_URL`/`HA_ACCESS_TOKEN`) from the environment
  rather than `config.json`. See `modules/room/README.md` for setup.
  `docs/MODULES.md` documents this secrets-vs-config pattern for future
  modules.
- Shared Google OAuth token refresh (`apps/api/app/core/google_auth.py`)
  and a one-time, dependency-free setup script
  (`scripts/google_oauth_setup.py`) that mints a refresh token via a
  normal browser consent flow - run once, then add the printed
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REFRESH_TOKEN` to `.env`.
- Communication module (`modules/communication`) now uses **real data**
  from Gmail (`gmail.modify` scope) instead of a mock inbox - polls for
  genuinely new mail and publishes `mail.received`.
- Calendar module (`modules/calendar`) now uses **real data** from
  Google Calendar (`calendar.readonly` scope) instead of `config.json`-
  seeded events - computes "today" using a configurable IANA timezone
  rather than the container's system clock, which commonly defaults to
  UTC regardless of the host.
- Tasks module (`modules/tasks`) now syncs with Google Tasks instead of
  holding tasks in memory - create/complete both go through the real API.
- `docker/docker-compose.yml`'s `api` service now runs with
  `network_mode: host`, needed for a future Google Cast module's mDNS/
  multicast device discovery (doesn't cross Docker's bridge network) -
  a deliberate LAN-exposure tradeoff, not a default to copy elsewhere
  without thinking about it again.
- `.gitignore` now excludes `client_secret*.json`/`credentials.json`/
  `token.json` unconditionally, regardless of where they land in the repo.
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
