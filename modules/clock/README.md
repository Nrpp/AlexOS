# Clock

The reference module. It exists to prove the module system end-to-end,
not to be an ambitious feature - keep changes here minimal, and copy this
folder's shape when starting a new module.

## What it does

- **Backend** (`backend/`): exposes `GET /api/v1/modules/clock/time` for an
  initial read, and an `on_load(event_bus, config)` hook that starts a
  tick loop (interval from `config.json`'s `tickIntervalSeconds`, 1 second
  by default) publishing `clock.tick` on the Core Event Bus - the only way
  it ever reaches the frontend.
- **Frontend** (`frontend/index.tsx`): a `ClockWidget` that subscribes to
  `clock.tick` and renders the current time and date. It also runs a local
  fallback timer so it never freezes or goes blank while the Event Bus
  connection is still coming up.

## Manifest

See `manifest.json` for the module's declared identity, permissions,
routes, and widgets - this is what the Module Manager validates on boot.

## Building a new module

Copy this folder's structure (`manifest.json`, `backend/`, `frontend/`,
`config.json`, `README.md`, `tests/`). See
[docs/MODULES.md](../../docs/MODULES.md) for the full contract.
