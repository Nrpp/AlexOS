# Roadmap

Architecture over features, always. Each version below builds on the
previous one without breaking it.

## 0.0.1 — Foundation (current)

Monorepo, Core, app shell, design system, module framework, one reference
module, Docker for dev and production. No real integrations yet.

## 0.1.0 — First real modules

- Weather module (real data, `WeatherUpdated` event).
- Calendar module (local/CalDAV).
- Tasks module.
- Notification Manager wired to real events (server online/offline,
  new mail, task completed).
- Persistent storage for user configuration and module state.

## 0.2.0 — Servers & Network

- Servers page: CPU/RAM/disk/temperature, Docker containers, restart
  actions.
- Network page: connected devices, bandwidth, latency, public/internal IP.
- Background workers for system monitoring.

## 0.3.0 — Communication & Media

- Gmail module.
- Spotify / Apple Music module.
- Quick reply and playback controls surfaced on the Home page.

## 0.4.0 — AI

- Alex Assistant chat interface.
- Conversation history.
- Local and cloud model support.

## 0.5.0 — Automation & Plugins

- Automation Engine: triggers, conditions, actions, schedules, workflows.
- Plugin installation/removal flow (copy folder → validate manifest →
  register → restart Core).
- Developer Mode in Settings.

## Future

- Light theme, custom themes, animated wallpapers.
- Cloud synchronization, offline-first sync resolution.
- Migration path to PostgreSQL.
- Android, iPad, and desktop clients sharing `packages/*`.
- Automatic updates, rollback, module/version migration.
- One-click backup and restore.
- Voice control, haptics.
