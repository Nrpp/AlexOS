# Network

Powers the Network page.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/network/status` for an
  initial read, and an `on_load(event_bus, config)` hook that ticks every
  `config.json`'s `tickIntervalSeconds` (5s default) publishing
  `network.updated`.
- **Frontend** (`frontend/index.tsx`): a `NetworkWidget` with live
  bandwidth/latency bars, device count, and IP addresses.

## Simulated data, and why

Same reasoning as `modules/servers`: real device discovery needs ARP/LAN
scanning, which needs host network mode in Docker (a security-relevant
privilege decision, not a default to slip in here). The public IP is
actually the one value here that could be real for free - one outbound
HTTP call to an IP-echo service, no credentials needed - but it's mocked
too for now so the widget doesn't show a mix of one real field alongside
several fake ones without a clear signal of which is which.

## Configuration

`config.json`:

- `tickIntervalSeconds` - how often a new reading is published.
- `publicIp` / `internalIp` - the simulated addresses shown.
