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
  timezone, in order. No background polling - fetched fresh on request,
  since there's no webhook support yet to push changes.
- **Frontend** (`frontend/index.tsx`): a `CalendarWidget` that fetches
  that list on mount, or shows "Google Calendar isn't connected" if the
  OAuth env vars aren't set.

## Scope

Uses `calendar.readonly` - this module only ever reads events, never
creates or modifies them.
