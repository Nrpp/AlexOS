# Calendar

Powers the Home page's "Today's calendar" card, and a full month-view
widget on the Communication page. **Real data** via Google Calendar.

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

- **Backend** (`backend/`):
  - `GET /api/v1/modules/calendar/events/today` - real events from
    Google Calendar for the configured calendar and timezone, in
    order. `on_load` also polls every `config.json`'s
    `tickIntervalSeconds` (120s default) and publishes
    `calendar.updated` (retained) - so an event added on your phone in
    Google Calendar's own app shows up here without a manual browser
    reload.
  - `GET /api/v1/modules/calendar/events/month?year=&month=` - every
    event in the given month, each with a `date` (the event's day in
    the configured timezone, not just its time) for the frontend to
    group into a day grid. Not polled/pushed like `/events/today` - the
    month widget fetches on demand (mount + navigation) since browsing
    a specific month isn't something that needs to feel "live" the way
    today's list does.
- **Frontend** (`frontend/index.tsx`):
  - Default export `CalendarWidget` - today's events, fetches on mount
    and refreshes on `calendar.updated`.
  - Named export `CalendarMonthWidget` - a full month grid (Monday-
    first) with prev/next navigation and a "Today" jump-back, showing
    up to 2 events per day inline ("+N more" beyond that). Wired onto
    the Communication page (`apps/web/src/pages/Communication/index.tsx`)
    alongside `modules/communication`'s inbox widget - see
    `docs/MODULES.md`'s note on `ModuleWidgetPage`'s `moduleName`
    accepting several modules at once.
  - Both show "Google Calendar isn't connected" only when there's
    genuinely no OAuth token yet - a real failure (bad timezone, Google
    API error) shows the actual error message instead, with a retry
    button.

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

This module itself only ever reads events, never creates or modifies them.
The shared OAuth client's scope is `calendar.events` rather than
`calendar.readonly`, though - see `scripts/google_oauth_setup.py` - because
other modules (`flight_tracker`, `package_tracker`, `timezone_planner`, via
`app.core.google_calendar.create_event`) need write access on the same
credentials.
