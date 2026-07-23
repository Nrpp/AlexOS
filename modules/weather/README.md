# Weather

Powers the Home page's Weather card.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/weather/current` for an
  initial read, and an `on_load(event_bus, config)` hook that ticks every
  `config.json`'s `tickIntervalSeconds` (300s default) publishing
  `weather.updated`.
- **Frontend** (`frontend/index.tsx`): a `WeatherWidget` that fetches the
  current reading on mount, then updates live from `weather.updated`.

## Mock data, by design

`backend/state.py`'s `MockWeatherProvider` generates a plausible reading
(a small random walk on temperature, a rotating condition) instead of
calling a real weather API. This was a deliberate choice for this pass -
no external API key/OAuth needed yet. To go real: replace
`MockWeatherProvider` with one that calls an actual provider; nothing
else (router, events, widget) needs to change, since they only ever see
`provider.read()`'s return shape.

## Configuration

`config.json`:

- `location` - display name for the reading.
- `units` - `"metric"` or `"imperial"`.
- `tickIntervalSeconds` - how often a new reading is published.
