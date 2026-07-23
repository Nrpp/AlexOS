# Media

Powers the Media page's now-playing card.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/media/now-playing`,
  `POST /playback` (`{ "action": "play" | "pause" | "next" | "previous" }`),
  and an `on_load(event_bus, config)` hook that ticks the playback
  position once a second while playing, publishing `media.updated`.
- **Frontend** (`frontend/index.tsx`): a `MediaWidget` with play/pause/
  skip controls and a progress bar.

## Mock player, and why

Spotify (or Apple Music) means OAuth and a real API key - neither
belongs in this pass. `backend/state.py`'s `MockPlayer` cycles through
`config.json`'s seeded playlist instead, advancing automatically when a
track "ends." Going real means replacing `MockPlayer` with a real
client; the router, event, and widget only ever see the same
`{ title, artist, durationSeconds, positionSeconds, isPlaying }` shape.

## Configuration

`config.json`'s `playlist` - each entry is
`{ "title": "...", "artist": "...", "durationSeconds": 210 }`.
