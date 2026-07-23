# Roadmap

Architecture over features, always. Each version below builds on the
previous one without breaking it.

## 0.0.1 — Foundation (current)

Monorepo, Core, app shell, design system, module framework, one reference
module, Docker for dev and production. No real integrations yet.

## 0.1.0 — Every page has a module (in progress)

Every planned page (except Vehicle - never detailed in the spec, see
below) now has a module wired end-to-end (manifest → backend → Event
Bus → widget), but every one of them runs on mock, simulated, or
in-memory data rather than a real source. Each module's own README
documents exactly what "going real" requires - that's the theme of
every version below until it stops being true.

- [x] `modules/clock` - the reference module, config-driven tick interval.
- [x] `modules/weather` - mocked reading, `weather.updated` event.
- [x] `modules/calendar` - events seeded from `config.json`, no live source yet.
- [x] `modules/tasks` - in-memory, `task.created`/`task.completed` events, lost on restart.
- [x] `modules/servers` - simulated CPU/RAM/disk/temperature, `server.metrics` event.
- [x] `modules/study` - Pomodoro timer, fully client-side, no backend.
- [x] `modules/network` - simulated devices/bandwidth/latency/IPs, `network.updated` event.
- [x] `modules/communication` - mock inbox, simulated new mail, `mail.received` event.
- [x] `modules/media` - mock player with real play/pause/skip controls, `media.updated` event.
- [x] `modules/ai` - scripted keyword replies, explicitly not a real language model.
- [x] `modules/room` - in-memory lights and Focus/Sleep/Morning scenes, `room.updated` event.
- [x] `modules/finance` - expenses seeded from `config.json` against a budget.
- [ ] Vehicle - no module, no page content. Part 2 of the spec lists it
      as a page but Part 5 never details what it should contain; nothing
      to build until that's actually specified.

## 0.2.0 — Persistence and real telemetry

- Persistent storage for module state (currently only Core
  config/notifications use the Storage Manager; tasks, mail, media
  position, and room state all reset on restart).
- Real Servers/Network telemetry - needs a deliberate decision about
  bind-mounting `/proc`/`/sys`/the disk device into the container (see
  `modules/servers/README.md` and `modules/network/README.md`).
- Notification Manager wired to real events (server online/offline,
  new mail, task completed).
- Docker container stats and restart actions on the Servers page.

## 0.3.0 — Real external integrations

- Real weather API.
- Real calendar source (CalDAV/Google Calendar).
- Gmail OAuth for Communication.
- Spotify/Apple Music OAuth for Media.
- Real smart-home connection (Home Assistant/Zigbee/Matter) for Room.
- Real bank/card integration for Finance.

## 0.4.0 — Real AI

- Replace the AI module's scripted keyword matcher with an actual
  language model call (local via something like Ollama, or a cloud
  API) - credentials in `.env`, never in code.
- Conversation history persisted, not just in-memory.

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
