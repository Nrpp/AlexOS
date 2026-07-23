# Servers

Powers the Servers page's system stats card.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/servers/stats` for an
  initial read, and an `on_load(event_bus, config)` hook that ticks every
  `config.json`'s `tickIntervalSeconds` (5s default) publishing
  `server.metrics`.
- **Frontend** (`frontend/index.tsx`): a `ServersWidget` with live bars
  for CPU, RAM, and disk, and a temperature reading.

## Simulated data, and why

Real CPU/RAM/disk numbers are one `psutil` call away - no external API
or credentials needed, unlike weather or calendar. The reason this
module is still simulated is Docker: in production, the API runs inside
a container, and:

- CPU/RAM read through `psutil` inside a container reflect the
  container's cgroup view, which is close to the host but not exactly
  it.
- Disk usage would reflect the container's own thin overlay filesystem,
  not the actual SD card/SSD capacity - almost certainly misleading.
- Temperature isn't visible from inside a standard container at all -
  it needs `/sys/class/thermal` bind-mounted in from the host.

Getting real numbers means either running the API outside Docker, or
deliberately bind-mounting `/proc`, `/sys`, and the host's actual disk
device into the container - a security-relevant decision (host
filesystem visibility) that deserves its own explicit choice, not a
default slipped in here. Until that decision is made, `backend/state.py`
generates plausible simulated readings so the widget and event pipeline
are fully wired and ready for the swap.

## Configuration

`config.json`:

- `tickIntervalSeconds` - how often a new reading is published.
- `ramTotalGb` / `diskTotalGb` - the simulated capacity the used values
  are measured against.
