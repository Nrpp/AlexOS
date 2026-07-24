# Calendar

Powers the Home page's "Today's calendar" card. **Real data** via
Google Calendar.

## Setup

Shares one Google OAuth client with `modules/communication` and
`modules/tasks` - if you've already run `scripts/google_oauth_setup.py`
for one of those, the same `.env` values cover this module too.

If not yet done:

```bash
python scripts/google_oauth_setup.py path/to/client_secret_....json
```

Then edit `modules/calendar/config.json` - set `timezone` to your real
IANA timezone name (e.g. `"America/New_York"`), and `calendarId` if
you're not using your primary calendar.

## Why `timezone` is configurable

Docker containers commonly default to UTC regardless of the host's
actual timezone. "Today" needs to mean the calendar owner's today, not
UTC's - so this module computes the day's start/end using the IANA
timezone from `config.json` (via Python's `zoneinfo`) rather than
trusting the container's system clock.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/calendar/events/today`
  - real events from Google Calendar for the configured calendar and
  timezone, in order. `on_load` also polls every `config.json`'s
  `tickIntervalSeconds` (120s default) and publishes `calendar.updated`
  (retained) - so an event added on your phone in Google Calendar's own
  app shows up here without a manual browser reload.
- **Frontend** (`frontend/index.tsx`): a `CalendarWidget` that fetches
  on mount and refreshes on `calendar.updated`. Shows "Google Calendar
  isn't connected" only when there's genuinely no OAuth token yet - a
  real failure (bad timezone, Google API error) shows the actual error
  message instead, with a retry button.

## Fixed bug: `ZoneInfoNotFoundError` crashing every request

Python's `zoneinfo` needs an IANA timezone database to resolve names
like `"Europe/Madrid"` - either from the OS, or from the `tzdata` PyPI
package. `python:3.12-slim` (this module's Docker base image) doesn't
reliably ship one, so every call to `_resolve_timezone()` raised
`ZoneInfoNotFoundError`, which propagated as an unhandled 500 - and the
frontend didn't check `response.ok`, so it displayed the generic "not
connected" message instead of the real error. Fixed two ways: added
`tzdata` to `apps/api/requirements.txt` (the actual fix), and made bad
timezones raise a distinct `CalendarConfigError` that the router turns
into a 422 with the real reason, so this class of bug can't hide behind
"not configured" again. Covered by `tests/test_state.py`.

## Scope

Uses `calendar.readonly` - this module only ever reads events, never
creates or modifies them.
