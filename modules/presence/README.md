# Presence

Knows whether the owner's phone (Android or iOS) is home, and turns
AlexOS into an always-on ambient display - clock, weather, moon phase,
nothing personal - whenever it isn't. Touching the screen while away
asks for a PIN before showing the real dashboard.

## Why this design

**No native app, no third-party tracker app.** OwnTracks and similar
were considered and rejected - the owner's iOS is 16.7, too old for
OwnTracks' current release, and building/maintaining a native app for
one feature isn't worth it. Instead, this module leans on
functionality every modern phone already has for free: **iOS
Shortcuts' personal Automations** and **Android's Tasker** (or any
similar automation app) can both watch a geofence at the OS level and
fire an HTTP request when you arrive at or leave a saved location.
AlexOS never receives GPS coordinates and never does geofence math -
the phone's OS already decided "arrived" or "left," and just tells
AlexOS which. That also means this module has nothing meaningful to
leak even if its storage were somehow read: a device's row is just a
name, a token, and the last event it reported.

**Per-device secret tokens, not a shared one.** AlexOS's API
(`apps/api/`) has no authentication anywhere else in the system, by
design - every other module assumes LAN-only access. `/webhook` is
the one deliberate exception: it's called from *outside* the LAN, by
design (that's the entire point - it has to fire when the phone
leaves home and loses the LAN). So it's the one endpoint in this whole
codebase that requires a secret, and each device gets its own
(`secrets.token_urlsafe(32)`), checked with `hmac.compare_digest`
(never `==`, which leaks timing information one byte at a time) so a
leaked or revoked phone never affects any other device.

**Fails toward privacy, not toward convenience.** With no device ever
having reported in, or with the primary device's last signal older
than `config.json`'s `staleAfterHours` (phone died, automation got
disabled, lost signal for a long trip, ...), the dashboard is treated
as **away and locked** - never the reverse. A bug or a dead phone
battery should never accidentally leave the real dashboard exposed.

**PIN hashed, never stored or logged in the clear.** PBKDF2-HMAC-SHA256
with a random per-PIN salt (stdlib `hashlib`/`secrets`, no new
dependency), 390,000 iterations. `POST /unlock` returns the exact same
401 for a wrong PIN and for "no PIN configured yet" - a stranger
poking at the kiosk can't even learn whether away mode has a PIN set
up.

**Device tokens stay retrievable, not one-time-only.** Unlike a typical
API key, a device's webhook token can be viewed again later in
Settings (behind an explicit "reveal" click - never shown by default),
because the owner will realistically need to re-open Shortcuts/Tasker
and re-enter the URL months later, and there's no way to "regenerate
and re-paste into two OS automations" without walking over to that
phone anyway. `hmac.compare_digest` makes the *comparison* constant-
time regardless of whether the stored value is a hash or the secret
itself, so this doesn't weaken the webhook's auth.

## Security model, in one paragraph

`/webhook?device_id=...&event=arrive|leave&token=...` is the only
internet-facing route AlexOS exposes anywhere. It requires a valid
`device_id` **and** a matching `token` (checked with
`hmac.compare_digest`); missing or wrong token both return the same
generic 401 so nothing about which device_ids are real ever leaks.
Repeated bad attempts from the same source IP are logged and, past a
threshold, rate-limited with a 429 (an in-memory sliding window - see
`backend/rate_limit.py`; deliberately simple, not a substitute for the
token itself). Every other route (`/status`, `/devices`, `/pin`,
`/unlock`, `/lock`, ...) is LAN-only, same trust model as the rest of
AlexOS. The PIN is hashed at rest; a device's token is stored
retrievably (see above) but never logged and never returned in bulk -
only via the explicit `GET /devices/{id}/token` "reveal" call.

## What it does

- **Backend** (`backend/`):
  - `GET|POST /webhook` - the phone's automation calls this on
    arrive/leave. Auth via `?token=`, checked first, before anything
    else about the request is even validated.
  - `GET /status` - `{ locked, home, primaryDeviceId, pinConfigured,
    devices }`. `home` is true only when the primary device's last
    event is `arrive` and that signal isn't stale (see
    `staleAfterHours` below). `locked` is true whenever `home` is
    false and there's no active PIN-unlock session.
  - `GET/POST /devices`, `PATCH /devices/{id}`, `DELETE
    /devices/{id}`, `GET /devices/{id}/token`, `POST
    /devices/{id}/primary` - manage devices and which one is
    authoritative for presence.
  - `POST /pin` - set or change the PIN (the current PIN is required
    to change an existing one; not required to set the first one).
  - `POST /unlock` - `{ pin }`. Starts an unlock session that expires
    after `config.json`'s `unlockTtlMinutes` (15 by default).
  - `POST /lock` - immediately re-locks (e.g. the owner is stepping
    out and wants the screen private right away, without waiting for
    their phone to report "left").
  - Publishes `presence.updated` (retained) on every state change, so
    the frontend reacts close to live - see `apps/api/app/core/event_bus.py`
    and how `apps/web` subscribes.
  - Storage is the Core Storage Manager's generic per-module key/value
    table (`apps/api/app/core/storage_manager.py`), same pattern as
    `modules/notes`/`modules/study` - no new database table, no raw
    SQLite.
- **Frontend** (`frontend/index.tsx`):
  - Default export `PresenceWidget` - a small Home-page status card
    (home/away, known devices) - selectable in Settings' "Home screen
    widgets" like any other module widget.
  - Named export `PresenceSettings` - the device/primary/PIN manager,
    wired into the Settings page (see
    `apps/web/src/pages/Settings/index.tsx`'s `PresenceSection`).
  - The actual away-mode gate lives one level up, at the app shell:
    `apps/web/src/layout/PresenceGate.tsx`, wrapped around the routed
    page in `apps/web/src/layout/AppShell.tsx`. It polls `GET /status`
    (via the `usePolling` hook in `packages/hooks`, so a server-side
    unlock TTL quietly expiring is still caught even with no Event Bus
    push) and also refetches immediately on `presence.updated`. While
    locked, it renders an ambient view - the Clock widget (reused
    as-is, not re-implemented) plus every other module whose
    `manifest.json` sets `"personal": false` - and a tap anywhere
    opens a PIN pad.

## The `"personal"` manifest field

`ModuleManifest` (`apps/api/app/models/schemas.py`, mirrored in
`packages/types/src/module.ts`) has an optional `personal: bool`
field, **defaulting to `true`** when a manifest doesn't set it. That
default is deliberate: every module that never thinks about away mode
stays fully hidden while away, with zero changes required to its own
manifest.json. Only four modules explicitly opt in to being shown on
the locked/ambient screen, because the owner named these specifically
as fine for an always-visible display:

- `modules/clock` (`"personal": false`)
- `modules/world_clock` (`"personal": false`)
- `modules/moon_phase` (`"personal": false`)
- `modules/weather` (`"personal": false`)

Nothing else was touched. If you build a new ambient-safe module later,
set `"personal": false` in its manifest.json - otherwise it's
correctly hidden by default.

## config.json

Non-secret tunables only - no PIN, no tokens, no device secrets ever
go here (this file is committed to git):

```json
{
  "unlockTtlMinutes": 15,
  "staleAfterHours": 24
}
```

- `unlockTtlMinutes` - how long a correct PIN keeps the dashboard
  unlocked before the gate re-checks `home`/re-locks.
- `staleAfterHours` - the safety fallback: if the primary device's
  last "arrive" is older than this, presence is treated as unknown
  (locked/away), not "still home." Set to `0` to disable this check
  entirely (trust the last event no matter its age) - not recommended.

No new environment variable is needed for this module - device
tokens and the PIN are generated and stored at runtime via the
Storage Manager, never read from `.env`. Contrast this with
`modules/room`'s `HA_BASE_URL`/`HA_ACCESS_TOKEN`, which *are*
environment-sourced because they're credentials for an external
service this module doesn't have.

## Setup

### 1. Register a device in AlexOS

Settings → **Presence & away mode** → **Add device** → give it a name
("Lucas's iPhone"). AlexOS generates a random token and shows it once
immediately; you can always come back and click **Reveal webhook
URLs** on that device later to see it (and copy the two URLs below)
again.

### 2. iOS Shortcuts (Atajos) - tested against iOS 16.7

Personal Automations have existed in Shortcuts since iOS 13, so this
works even on an older iPhone that's stuck on 16.7 - no newer iOS
feature required.

1. Open **Atajos** (Shortcuts) → tab **Automatización** (Automation)
   → **Crear automatización personal** (Create Personal Automation).
2. Choose **Ubicación** (Location) → pick the phone's saved **Casa**
   (Home) location (or drop a pin for it) → **Al llegar** (When I
   Arrive) → **Siguiente** (Next).
3. Add action **Obtener contenido de URL** (Get Contents of URL).
   - **URL**: the Arrive URL from AlexOS Settings, e.g.
     `https://your-alexos-host/api/v1/modules/presence/webhook?device_id=lucas-iphone-a1b2c3&event=arrive&token=<TOKEN>`
   - **Método** (Method): `GET` is enough - there's no body to send,
     everything's in the URL's query string.
4. **Siguiente** → on the confirmation screen, turn **off** "Preguntar
   antes de ejecutar" (Ask Before Running) so it fires silently in the
   background.
5. Repeat steps 1-4 for a **second** automation using **Al salir**
   (When I Leave) instead of "Al llegar," and the **Leave** URL
   (`event=leave`) instead of the Arrive one.

You now have two silent automations: one fires `event=arrive` when the
phone reaches home, the other fires `event=leave` when it departs.

### 3. Android (Tasker)

1. Open **Tasker** → **Perfiles** (Profiles) tab → **+** → **Estado**
   (State) → **Ubicación** (Location) → **Entrada/salida de
   proximidad** (Proximity Sensor / geospatial entry-exit), or your
   Tasker version's location-based profile trigger → set it to your
   home location and a reasonable radius (100-150m is typical) →
   choose **Entrada** (Entry) for the first profile.
2. When prompted for a task, create a new one: add action **Net** →
   **HTTP Request** (or **HTTP Get**, depending on your Tasker
   version).
   - **Method**: `GET`
   - **URL**: the Arrive URL from AlexOS Settings (same shape as
     above, with `event=arrive`)
3. Save. Create a **second** profile the same way, using **Salida**
   (Exit) instead of Entry, with a task pointing at the **Leave** URL
   (`event=leave`).

Tasker's location trigger is itself geofence-based (same idea as iOS's
"Arrive/Leave a location" automation) - AlexOS still never sees raw
GPS, only the two events.

### 4. Choose the primary device

Settings → **Presence & away mode** → **Set primary** next to the
device whose presence should drive `home`. Only the primary device's
events matter for lock/unlock - other registered devices (a second
phone, a partner's phone if the owner wants to track it too) still
show their own status but don't affect the lock.

### 5. Set a PIN

Settings → **Presence & away mode** → **Away-mode PIN** section → set
a 4-8 digit PIN. Away mode can't be unlocked from the ambient screen
until a PIN exists.

### 6. Exposing the webhook outside your LAN

The owner already runs Tailscale (`modules/tailscale/` in this repo).
The recommended way to reach `/webhook` from outside the house is
[`tailscale serve` or `tailscale funnel`](https://tailscale.com/kb/1223/funnel)
on the Pi, pointed at the API container's port - **not** opening the
raw port to the public internet. Either way, the per-device token is
still required on every call (defense in depth), so this module works
correctly no matter how the owner ultimately exposes it - a Tailscale
Funnel URL, a reverse proxy, a VPN-only setup, etc. See
`modules/tailscale/README.md` for how Tailscale is already wired into
this repo's Docker setup.

## Testing note

`modules/presence/tests/` covers `security.py` and `state.py` directly
plus full HTTP-layer tests against `router.py` mounted on a bare
FastAPI app (fake storage manager, real in-memory `EventBus`) - see
`test_router.py`'s docstring for why it loads the backend package the
same way `ModuleManager._import_backend_package` does at runtime, and
`docs/MODULES.md`'s import gotcha for why `router.py` imports every
sibling name explicitly (`from .state import compute_status`, never
`from . import state`).

What's **not** verified here: an actual round trip from a real iPhone
running iOS 16.7 Shortcuts or a real Android phone running Tasker -
that needs a first real check against the owner's own phones and
whatever Tailscale/reverse-proxy setup they choose for step 6 above.
