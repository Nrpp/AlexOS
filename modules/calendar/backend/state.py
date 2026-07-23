"""Real Google Calendar integration. Shares the Google OAuth client
with modules/communication and modules/tasks - see
apps/api/app/core/google_auth.py and the module README."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta
from typing import Any
from urllib.parse import quote
from zoneinfo import ZoneInfo

import httpx

from app.core.google_auth import google_auth

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


def event_to_payload(event: CalendarEvent) -> dict[str, Any]:
    return {"time": event.time, "title": event.title}


def _today_bounds(tz: ZoneInfo) -> tuple[str, str]:
    now = datetime.now(tz)
    start = datetime.combine(now.date(), time.min, tzinfo=tz)
    end = start + timedelta(days=1)
    return start.isoformat(), end.isoformat()


def _format_event_time(start: dict[str, Any], tz: ZoneInfo) -> str:
    if "dateTime" in start:
        return datetime.fromisoformat(start["dateTime"]).astimezone(tz).strftime("%H:%M")
    return "All day"


async def list_today_events() -> list[CalendarEvent] | None:
    """None means Google Calendar isn't configured - distinct from a day with no events."""
    access_token = await google_auth.get_access_token()
    if access_token is None:
        return None

    # A configurable IANA timezone rather than the container's system
    # time, since Docker containers commonly default to UTC regardless
    # of the host's actual timezone - relying on that would put "today"
    # in the wrong day near midnight.
    tz = ZoneInfo(_timezone_name)
    time_min, time_max = _today_bounds(tz)

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
        CalendarEvent(time=_format_event_time(item["start"], tz), title=item.get("summary", "(no title)"))
        for item in data.get("items", [])
    ]
