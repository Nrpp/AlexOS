# Flight Tracker

Powers the Flights page's saved-flights card.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/flight_tracker/flights`,
  `POST /flights` (`{flightNumber, departureIso, arrivalIso?, airline?, notes?}`),
  `DELETE /flights/{id}`. Saving a flight also tries to create a real
  event on your Google Calendar (see `app.core.google_calendar`,
  shared with `modules/calendar`/`modules/tasks`/`modules/communication`'s
  OAuth client) - if Google isn't connected, the flight still saves,
  it just won't appear on your calendar (`calendarEventCreated: false`
  in the response, shown in the widget).
- **Tracking link**: each saved flight links to
  `https://www.flightaware.com/live/flight/{flightNumber}` - FlightAware
  supports this URL format without an API key for casual lookups, so
  no credentials are needed just to track a flight you already saved.
- **Frontend** (`frontend/index.tsx`): a `FlightTrackerWidget` listing
  saved flights (soonest first), each linking out to FlightAware.

## No live flight-status API, and why

Real-time flight status (departed/delayed/landed, gate info, ...) needs
a paid API in practice - the well-known free-tier options (AviationStack,
AeroDataBox) are rate-limited to the point of being impractical for a
background-refreshing widget. Rather than build on something that'll
stop working the moment you actually use it, this module is a manual
save-and-link tool: you enter the flight, it gives you a direct
FlightAware link (which *does* have live status) and puts it on your
calendar.

## Timezone

`config.json`'s `timezone` (an IANA name, e.g. `"Europe/Madrid"`) is
used for the calendar event - same simplification `modules/calendar`
makes: one configured timezone rather than per-airport lookup, since a
flight crossing timezones doesn't have one "correct" instant to show
this event against anyway.
