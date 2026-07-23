# Roadmap

Architecture over features, always. Each version below builds on the
previous one without breaking it.

## 0.0.1 — Foundation (current)

Monorepo, Core, app shell, design system, module framework, one reference
module, Docker for dev and production. No real integrations yet.

## 0.1.0 — Foundation modules (done)

Weather, Calendar, Tasks, Servers, Study, Network, Communication, Media,
and Room all exist and are wired end-to-end (manifest → backend → Event
Bus → widget), proving the module system on mock/simulated/in-memory
data. AI and Finance were built the same way and then removed - they
weren't worth keeping as scripted placeholders. Vehicle was never built
at all: Part 2 of the spec lists it as a page but Part 5 never details
what it should contain, and nothing else in the product spec fills that
gap.

- [x] `modules/clock` - the reference module, config-driven tick interval.
- [x] `modules/weather` - mocked reading, `weather.updated` event.
- [x] `modules/calendar` - events seeded from `config.json`, no live source yet.
- [x] `modules/tasks` - in-memory, `task.created`/`task.completed` events, lost on restart.
- [x] `modules/servers` - simulated CPU/RAM/disk/temperature, `server.metrics` event.
- [x] `modules/study` - Pomodoro timer, fully client-side, no backend.
- [x] `modules/network` - simulated devices/bandwidth/latency/IPs, `network.updated` event.
- [x] `modules/communication` - mock inbox, simulated new mail, `mail.received` event.
- [x] `modules/media` - mock player with real play/pause/skip controls, `media.updated` event.
- [x] `modules/room` - in-memory lights and Focus/Sleep/Morning scenes, `room.updated` event.

## 0.2.0 — Real integrations (current focus)

Replacing mock data with real accounts/services. Each needs its own
external setup (a cloud console project, a developer account, a local
token) before any code changes - see each module's README once started.

- [ ] Google (Gmail, Calendar, Tasks) - one OAuth app covers all three;
      replaces `modules/communication` and `modules/calendar`, and is a
      new module for tasks synced from Google rather than staying
      purely in-memory.
- [ ] Apple Music - replaces `modules/media`'s mock player.
- [ ] Home Assistant - powers `modules/room` for real, and is the
      natural first step toward real `modules/servers`/`modules/network`
      telemetry too.
- [ ] Real weather API - replaces `modules/weather`'s mock provider.

## 0.3.0 — Persistence and real telemetry

- Persistent storage for module state (currently only Core
  config/notifications use the Storage Manager).
- Real Servers/Network telemetry - needs a deliberate decision about
  bind-mounting `/proc`/`/sys`/the disk device into the container (see
  `modules/servers/README.md` and `modules/network/README.md`).
- Notification Manager wired to real events (server online/offline,
  new mail, task completed).
- Docker container stats and restart actions on the Servers page.

## 0.4.0 — Automation & Plugins

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
