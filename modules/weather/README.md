# Weather

Powers the Home page's Weather card. **Real data** via
[Open-Meteo](https://open-meteo.com) - free, no API key or account
required.

## Set your location

Edit `modules/weather/config.json`:

```json
{
  "latitude": 40.4168,
  "longitude": -3.7038,
  "location": "Madrid",
  "units": "metric",
  "tickIntervalSeconds": 900
}
```

The shipped coordinates are a placeholder (Madrid) - change `latitude`/
`longitude` to your actual location (`location` is just the display
label) and restart the backend. `units` is `"metric"` or `"imperial"`.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/weather/current` calls
  Open-Meteo directly for an initial read. `on_load(event_bus, config)`
  ticks every `tickIntervalSeconds` (900s/15min default - real weather
  doesn't need frequent polling) publishing `weather.updated`.
- **Frontend** (`frontend/index.tsx`): a `WeatherWidget` that fetches on
  mount, updates live from `weather.updated`, and shows a friendly retry
  state if Open-Meteo is unreachable (never a raw error).

## Failure handling

If a request to Open-Meteo fails, `OpenMeteoProvider` returns the last
successful reading instead of erroring, so a brief network hiccup
doesn't blank the widget. If there's no previous reading yet (e.g. right
after startup), the API returns a 503 and the widget shows a retry
button via `CardError`.
