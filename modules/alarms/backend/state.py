"""Alarms - a label and a "HH:MM" time (24h, no seconds). Same generic
module-data pattern as modules/habit_tracker (duplicated, not shared -
modules are independently loaded).

Whether an alarm has *already fired today* is deliberately NOT stored
here - see backend/__init__.py's tick loop, which tracks that in memory
instead. on_load() only ever receives (event_bus, config), never the
StorageManager (see docs/MODULES.md), so a background task can't write
back to storage without a second DB connection - simplest to just not
need to."""

from __future__ import annotations

import json
import re
import uuid
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "alarms"
_LIST_KEY = "alarms"
_TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


class InvalidTimeError(ValueError):
    """Raised for a time string that isn't strict 24h HH:MM."""


def _validate_time(value: str) -> str:
    if not _TIME_PATTERN.match(value):
        raise InvalidTimeError(f"'{value}' isn't a valid 24h HH:MM time.")
    return value


async def list_alarms(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    alarms: list[dict[str, Any]] = json.loads(raw) if raw else []
    return sorted(alarms, key=lambda a: a["time"])


async def _save(storage: StorageManager, alarms: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(alarms))


async def create_alarm(storage: StorageManager, label: str, time_str: str) -> dict[str, Any]:
    _validate_time(time_str)
    alarms = await list_alarms(storage)
    alarm = {"id": str(uuid.uuid4()), "label": label, "time": time_str, "enabled": True}
    alarms.append(alarm)
    await _save(storage, alarms)
    return alarm


async def set_enabled(storage: StorageManager, alarm_id: str, enabled: bool) -> dict[str, Any] | None:
    alarms = await list_alarms(storage)
    for alarm in alarms:
        if alarm["id"] == alarm_id:
            alarm["enabled"] = enabled
            await _save(storage, alarms)
            return alarm
    return None


async def delete_alarm(storage: StorageManager, alarm_id: str) -> bool:
    alarms = await list_alarms(storage)
    remaining = [a for a in alarms if a["id"] != alarm_id]
    if len(remaining) == len(alarms):
        return False
    await _save(storage, remaining)
    return True


def due_alarms(
    alarms: list[dict[str, Any]], current_hhmm: str, today: str, fired_today: dict[str, str]
) -> list[dict[str, Any]]:
    """Pure - used by backend/__init__.py's tick loop, kept here (rather
    than in __init__.py itself) so it's testable without the relative-
    import machinery a module's __init__.py needs (see docs/MODULES.md's
    import gotcha) getting in the way."""
    due = []
    for alarm in alarms:
        if not alarm.get("enabled"):
            continue
        if alarm.get("time") != current_hhmm:
            continue
        if fired_today.get(alarm["id"]) == today:
            continue
        due.append(alarm)
    return due
