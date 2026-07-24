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
Apple Music was considered and dropped (no Apple Developer Program
membership) in favor of Google Cast for Media.

- [x] Weather (`modules/weather`) - real data via Open-Meteo, no API key needed.
- [x] Room (`modules/room`) - real lights via Home Assistant's REST API
      (`HA_BASE_URL`/`HA_ACCESS_TOKEN`), the first module reading a
      secret from the environment rather than `config.json`.
- [x] Google (`apps/api/app/core/google_auth.py` + `modules/communication`,
      `modules/calendar`, `modules/tasks`) - one shared OAuth client
      (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REFRESH_TOKEN`,
      minted once via `scripts/google_oauth_setup.py`) covers Gmail,
      Calendar, and Tasks. Each module gracefully reports "not
      configured" until the refresh token is added to `.env`.
- [ ] Google Cast - discover what's playing on cast devices on the LAN
      and show a minimal now-playing display, replacing `modules/media`'s
      mock player. `network_mode: host` is now enabled on the `api`
      service in `docker/docker-compose.yml` for exactly this (mDNS/
      multicast discovery doesn't cross Docker's bridge network) - the
      module itself isn't built yet.

## 0.2.1 — Core UI polish (done)

- [x] Real light theme (Settings' toggle actually switches themes now).
- [x] Status Bar weather indicator, Notifications popover, and Quick
      Settings popover wired to real data instead of placeholders.
- [x] Event Bus retained-event replay for "current state" events so the
      Status Bar and widgets don't show blank/stale data until the next tick.
- [x] Automate getting Google/Home Assistant secrets onto the Raspberry
      Pi without ever putting them on GitHub (`scripts/configure_secrets.py`).
- [x] Full email viewing in `modules/communication` - a message's full
      body (not just the inbox snippet), rendered as plain text
      (HTML-only messages are converted server-side, never sent to the
      frontend as raw HTML).
- [x] Multi-widget module support - the frontend registry
      (`apps/web/src/modules/registry.ts`) now collects every widget a
      module exports (default plus any named exports), not just one.
- [x] Study module: exam countdown, homework tracker, and a to-do list
      dedicated to studying, alongside Pomodoro - all three persisted
      server-side via a new generic module-data table (`ModuleDataEntry`)
      on the Core Storage Manager, so a small module doesn't need its own
      SQL table just to remember a list across restarts.
- [x] Servers: real Docker container list + start/stop/restart, via the
      host's `/var/run/docker.sock` bind-mounted into the `api`
      container - a deliberate, root-equivalent security tradeoff (see
      `modules/servers/README.md`). CPU/RAM/disk/temperature stay
      simulated (separate decision, see 0.3.0).
- [x] Network: real internal/public IP, real internet latency, real
      LAN device discovery (ARP + on-demand ping sweep, Linux-only),
      and an on-demand speed test (`speedtest-cli`), replacing the
      simulated provider. Per-device bandwidth usage was scoped and
      explicitly not built - not observable from a Pi that isn't the
      LAN's own gateway (see `modules/network/README.md`).
- [x] `modules/focus` - start/stop a focus session, publishes
      `focus.started`/`focus.ended` and fires outbound webhooks
      (`FOCUS_WEBHOOK_URLS`) so other devices can react. This is the
      trigger, not the enforcement - no platform exposes a remotely
      triggerable DND toggle, so each device needs its own local
      listener: Pushcut on iPad, Tasker+Join/AutoRemote on Android, and
      (documented, not yet built) a WebSocket listener script for
      Windows. See `modules/focus/README.md` for the honest limitations
      and per-device setup.

- [x] Control center (`modules/control_center`) - real WiFi and
      Bluetooth control in Settings, via `nmcli`/`bluetoothctl` over a
      bind-mounted host D-Bus socket (another documented, deliberate
      security tradeoff). Not verified against real hardware.

## 0.3.0 — Persistence and real telemetry

- Persistent storage for module state (currently only Core
  config/notifications use the Storage Manager).
- Real Servers CPU/RAM/disk/temperature telemetry - needs a deliberate
  decision about bind-mounting `/proc`/`/sys`/the disk device into the
  container (see `modules/servers/README.md`). Docker container
  list/controls shipped in 0.2.1 without needing this.
- Notification Manager wired to real events (server online/offline,
  new mail, task completed).

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
