"""Shared Google Calendar event *creation*, used by any module that
wants to put something on the user's real calendar (a flight, a
package's estimated delivery, a planned cross-timezone meeting, ...).
Reuses the same OAuth client as modules/calendar, modules/tasks,
modules/communication (see app.core.google_auth) - no separate setup.

modules/calendar itself only reads today's events; this is the create
counterpart, kept here rather than inside modules/calendar because a
module never imports another module (see docs/ARCHITECTURE.md) - any
module needing this imports it from app.core like google_auth itself.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx

from app.core.google_auth import google_auth

_API_BASE = "https://www.googleapis.com/calendar/v3/calendars"


async def create_event(
    summary: str,
    start_iso: str,
    end_iso: str,
    timezone: str,
    *,
    calendar_id: str = "primary",
    description: str = "",
) -> dict[str, Any] | None:
    """Creates a real event on the user's Google Calendar. Returns the
    created event's data, or None if Google isn't configured (checked
    the same way as everywhere else - no OAuth credentials in the
    environment yet, not an error)."""
    access_token = await google_auth.get_access_token()
    if access_token is None:
        return None

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{_API_BASE}/{quote(calendar_id, safe='')}/events",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "summary": summary,
                "description": description,
                "start": {"dateTime": start_iso, "timeZone": timezone},
                "end": {"dateTime": end_iso, "timeZone": timezone},
            },
        )
        response.raise_for_status()
        return response.json()
