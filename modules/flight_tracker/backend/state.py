"""Saved flights - a manual list (no live flight-status API - most
require a paid key, see the module README), each with a FlightAware
tracking link and, if Google Calendar is connected
(app.core.google_auth), a real calendar event created at save time.
Same generic module-data pattern as modules/habit_tracker for the list
itself (duplicated, not shared - modules are independently loaded)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta
from typing import Any

from app.core.google_calendar import create_event
from app.core.storage_manager import StorageManager

MODULE_NAME = "flight_tracker"
_LIST_KEY = "flights"

# A default 2h duration for the calendar event when no arrival time was
# given - long enough to cover a typical short/medium-haul flight
# without needing the user to know their exact arrival time up front.
_DEFAULT_DURATION = timedelta(hours=2)

_timezone = "UTC"


def configure(config: dict[str, Any]) -> None:
    global _timezone
    _timezone = config.get("timezone", _timezone)


def tracking_url(flight_number: str) -> str:
    return f"https://www.flightaware.com/live/flight/{flight_number.replace(' ', '').upper()}"


async def _all_flights(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    return json.loads(raw) if raw else []


async def _save(storage: StorageManager, flights: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(flights))


async def list_flights(storage: StorageManager) -> list[dict[str, Any]]:
    flights = await _all_flights(storage)
    return sorted(flights, key=lambda f: f["departureIso"])


async def create_flight(
    storage: StorageManager,
    flight_number: str,
    departure_iso: str,
    arrival_iso: str | None,
    airline: str,
    notes: str,
) -> dict[str, Any]:
    flights = await _all_flights(storage)
    flight: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "flightNumber": flight_number,
        "departureIso": departure_iso,
        "arrivalIso": arrival_iso,
        "airline": airline,
        "notes": notes,
        "trackingUrl": tracking_url(flight_number),
        "calendarEventCreated": False,
    }

    end_iso = arrival_iso or (datetime.fromisoformat(departure_iso) + _DEFAULT_DURATION).isoformat()
    description_parts = [flight["trackingUrl"]]
    if airline:
        description_parts.append(airline)
    if notes:
        description_parts.append(notes)

    event = await create_event(
        f"Flight {flight_number}",
        departure_iso,
        end_iso,
        _timezone,
        description="\n".join(description_parts),
    )
    flight["calendarEventCreated"] = event is not None

    flights.append(flight)
    await _save(storage, flights)
    return flight


async def delete_flight(storage: StorageManager, flight_id: str) -> bool:
    flights = await _all_flights(storage)
    remaining = [f for f in flights if f["id"] != flight_id]
    if len(remaining) == len(flights):
        return False
    await _save(storage, remaining)
    return True
