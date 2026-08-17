"""Saved timezones + a "plan a meeting" time converter, home/base
timezone from config.json (same simplification modules/calendar makes -
one configured timezone rather than reading it from the browser).
Saved-zones list uses the same generic module-data pattern as
modules/habit_tracker (duplicated, not shared - modules are
independently loaded)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from app.core.google_calendar import create_event
from app.core.storage_manager import StorageManager

MODULE_NAME = "timezone_planner"
_LIST_KEY = "zones"

_base_timezone = "UTC"

# A default 30-minute duration for a planned meeting's calendar event.
_DEFAULT_MEETING_DURATION = timedelta(minutes=30)


def configure(config: dict[str, Any]) -> None:
    global _base_timezone
    _base_timezone = config.get("baseTimezone", _base_timezone)


async def _all_zones(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    return json.loads(raw) if raw else []


async def _save(storage: StorageManager, zones: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(zones))


async def list_zones(storage: StorageManager) -> list[dict[str, Any]]:
    return await _all_zones(storage)


async def add_zone(storage: StorageManager, name: str, label: str) -> dict[str, Any]:
    zones = await _all_zones(storage)
    zone = {"id": str(uuid.uuid4()), "name": name, "label": label or name}
    zones.append(zone)
    await _save(storage, zones)
    return zone


async def remove_zone(storage: StorageManager, zone_id: str) -> bool:
    zones = await _all_zones(storage)
    remaining = [z for z in zones if z["id"] != zone_id]
    if len(remaining) == len(zones):
        return False
    await _save(storage, remaining)
    return True


def convert_times(base_timezone: str, base_iso: str, zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Pure - no I/O, so it's directly unit-testable with concrete IANA
    zone names."""
    base_dt = datetime.fromisoformat(base_iso).replace(tzinfo=ZoneInfo(base_timezone))
    conversions = []
    for zone in zones:
        target_dt = base_dt.astimezone(ZoneInfo(zone["name"]))
        conversions.append(
            {
                "name": zone["name"],
                "label": zone.get("label") or zone["name"],
                "localTime": target_dt.strftime("%Y-%m-%d %H:%M"),
            }
        )
    return conversions


async def convert_for_saved_zones(storage: StorageManager, base_iso: str) -> dict[str, Any]:
    zones = await _all_zones(storage)
    return {"baseTimezone": _base_timezone, "conversions": convert_times(_base_timezone, base_iso, zones)}


async def create_meeting(title: str, base_iso: str) -> bool:
    end_iso = (datetime.fromisoformat(base_iso) + _DEFAULT_MEETING_DURATION).isoformat()
    event = await create_event(title, base_iso, end_iso, _base_timezone)
    return event is not None
