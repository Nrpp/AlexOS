"""Real Google Calendar integration. Shares the Google OAuth client
with modules/communication and modules/tasks - see
apps/api/app/core/google_auth.py and the module README."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta
from typing import Any
from urllib.parse import quote
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from app.core.google_auth import google_auth


class CalendarConfigError(Exception):
    """Raised for a misconfigured calendar (e.g. an invalid IANA
    timezone name) - distinct from httpx.HTTPError (a real network/API
    failure) and from "not configured" (no OAuth credentials yet), so
    the router can report each one honestly instead of collapsing them
    all into a generic error the frontend can't distinguish."""


_API_BASE = "https://www.googleapis.com/calendar/v3/calendars"

_calendar_id = "primary"
_timezone_name = "UTC"


def configure(config: dict[str, Any]) -> None:
    global _calendar_id, _timezone_name
    _calendar_id = config.get("calendarId", _calendar_id)
    _timezone_name = config.get("timezone", _timezone_name)


@dataclass
class CalendarEvent:
    time: str
    title: str
    date: str  # ISO "YYYY-MM-DD", in the configured timezone - what the month view groups by.


def event_to_payload(event: CalendarEvent) -> dict[str, Any]:
    return {"time": event.time, "title": event.title, "date": event.date}


def _today_bounds(tz: ZoneInfo) -> tuple[str, str]:
    now = datetime.now(tz)
    start = datetime.combine(now.date(), time.min, tzinfo=tz)
    end = start + timedelta(days=1)
    return start.isoformat(), end.isoformat()


def _month_bounds(year: int, month: int, tz: ZoneInfo) -> tuple[str, str]:
    start = datetime(year, month, 1, tzinfo=tz)
    end = datetime(year + 1, 1, 1, tzinfo=tz) if month == 12 else datetime(year, month + 1, 1, tzinfo=tz)
    return start.isoformat(), end.isoformat()


def _format_event_time(start: dict[str, Any], tz: ZoneInfo) -> str:
    if "dateTime" in start:
        return datetime.fromisoformat(start["dateTime"]).astimezone(tz).strftime("%H:%M")
    return "All day"


def _format_event_date(start: dict[str, Any], tz: ZoneInfo) -> str:
    # All-day events carry a plain "date" (no time/zone to convert);
    # timed events carry "dateTime" and need converting to the
    # configured timezone before taking its date, same reasoning as
    # _format_event_time - an event just before/after local midnight
    # must land on the correct local day, not the API response's own zone.
    if "dateTime" in start:
        return datetime.fromisoformat(start["dateTime"]).astimezone(tz).date().isoformat()
    return start["date"]


def _resolve_timezone(name: str) -> ZoneInfo:
    """Raises CalendarConfigError (not ZoneInfoNotFoundError) for an
    unrecognized name - e.g. a typo in config.json, or a missing
    `tzdata` package (regression - see apps/api/requirements.txt and
    tests/test_state.py)."""
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError as error:
        raise CalendarConfigError(
            f"'{name}' isn't a recognized IANA timezone name (check modules/calendar/config.json)"
        ) from error


async def _fetch_events(time_min: str, time_max: str, tz: ZoneInfo, access_token: str) -> list[CalendarEvent]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{_API_BASE}/{quote(_calendar_id, safe='')}/events",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "timeMin": time_min,
                "timeMax": time_max,
                "singleEvents": "true",
                "orderBy": "startTime",
            },
        )
        response.raise_for_status()
        data = response.json()

    return [
        CalendarEvent(
            time=_format_event_time(item["start"], tz),
            title=item.get("summary", "(no title)"),
            date=_format_event_date(item["start"], tz),
        )
        for item in data.get("items", [])
    ]


async def list_today_events() -> list[CalendarEvent] | None:
    """None means Google Calendar isn't configured - distinct from a day with no events."""
    access_token = await google_auth.get_access_token()
    if access_token is None:
        return None

    # A configurable IANA timezone rather than the container's system
    # time, since Docker containers commonly default to UTC regardless
    # of the host's actual timezone - relying on that would put "today"
    # in the wrong day near midnight.
    tz = _resolve_timezone(_timezone_name)
    time_min, time_max = _today_bounds(tz)
    return await _fetch_events(time_min, time_max, tz, access_token)


async def list_month_events(year: int, month: int) -> list[CalendarEvent] | None:
    """None means Google Calendar isn't configured - same convention as
    list_today_events. Powers the month-view widget: every event in
    the given month, in the configured timezone, for the frontend to
    group by `date` into day cells."""
    access_token = await google_auth.get_access_token()
    if access_token is None:
        return None

    tz = _resolve_timezone(_timezone_name)
    time_min, time_max = _month_bounds(year, month, tz)
    return await _fetch_events(time_min, time_max, tz, access_token)
