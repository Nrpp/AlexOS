# Calendar

Powers the Home page's "Today's calendar" card.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/calendar/events/today`
  returns the events seeded in `config.json`, sorted by time.
- **Frontend** (`frontend/index.tsx`): a `CalendarWidget` that fetches
  that list on mount and renders it, or a proper empty state if there's
  nothing today.

## Mock data, by design

There's no live calendar source wired up yet - `config.json`'s `events`
list stands in for one. Going real (CalDAV, Google Calendar, ...) means
replacing `backend/state.py`'s `configure()` with something that fetches
from that source instead of reading `config.json`; the router and widget
don't need to change, since they only ever see the same event shape
(`{ time, title }`).

## Configuration

`config.json`'s `events` array: each entry is `{ "time": "HH:MM", "title": "..." }`.
