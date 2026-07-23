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
- Widget prop contract extended with `apiBaseUrl` alongside `eventBus`,
  for widgets that need an initial REST read or to write data back.
- Main content area widened to 90rem (`apps/web/src/layout/AppShell.tsx`).

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
