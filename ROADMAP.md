# Roadmap

Architecture over features, always. Each version below builds on the
previous one without breaking it.

## 0.0.1 — Foundation (current)

Monorepo, Core, app shell, design system, module framework, one reference
module, Docker for dev and production. No real integrations yet.

## 0.1.0 — First modules (in progress)

Weather, Calendar, Tasks, and Servers all exist and are wired end-to-end
(manifest → backend → Event Bus → widget), but on mock or in-memory data
rather than real sources - each module's README documents exactly what
"going real" requires:

- [x] Weather module (`modules/weather`) - mocked reading, `weather.updated` event.
- [x] Calendar module (`modules/calendar`) - events seeded from `config.json`, no live source yet.
- [x] Tasks module (`modules/tasks`) - in-memory, `task.created`/`task.completed` events, lost on restart.
- [x] Servers module (`modules/servers`) - simulated CPU/RAM/disk/temperature, `server.metrics` event.
- [ ] Real weather API integration.
- [ ] Real calendar source (CalDAV/Google Calendar).
- [ ] Persistent storage for tasks and module state (currently only
      Core config/notifications use the Storage Manager).
- [ ] Notification Manager wired to real events (server online/offline,
      new mail, task completed).
- [ ] Real host telemetry for Servers - needs a deliberate decision about
      bind-mounting `/proc`/`/sys`/the disk device into the container
      (see `modules/servers/README.md`).

## 0.2.0 — Network & real telemetry

- Network page: connected devices, bandwidth, latency, public/internal IP.
- Real Servers telemetry (the container-privilege decision above),
  Docker container stats, restart actions.
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
