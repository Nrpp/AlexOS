# Room

Powers the Room page's lights and scenes card.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/room/lights`,
  `PATCH /lights/{id}` (`{ "on"?: bool, "brightness"?: 0-100 }`),
  `POST /scenes/{name}` (`focus` / `sleep` / `morning`) - all publish
  `room.updated`. `on_load(event_bus, config)` seeds lights from
  `config.json`.
- **Frontend** (`frontend/index.tsx`): a `RoomWidget` with per-light
  toggles and three scene buttons.

## In-memory, and why

There's no real Home Assistant/Zigbee/Matter connection here - that's a
hardware and protocol integration, not something to fake convincingly
with mock data the way weather or calendar can be. `backend/state.py`
holds lights seeded from `config.json` and mutates them directly.
Going real means replacing the in-memory dict with calls to a real hub's
API; the router, event, and widget don't need to change, since they
only ever see `{ id, name, on, brightness }`.

## Configuration

`config.json`'s `lights` - each entry is
`{ "id": "...", "name": "...", "on": bool, "brightness": 0-100 }`.
