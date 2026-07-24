"""Real, persisted daily water count - resets automatically each day
(based on the real calendar date, not a timer) via the generic
module-data table (same pattern as modules/study/notes)."""

from __future__ import annotations

import json
from datetime import date
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "water_tracker"
_KEY = "today"


class WaterTrackerSettings:
    def __init__(self) -> None:
        self.daily_goal = 8

    def configure(self, config: dict[str, Any]) -> None:
        self.daily_goal = config.get("dailyGoal", self.daily_goal)


settings = WaterTrackerSettings()


async def _load(storage: StorageManager) -> dict[str, Any]:
    raw = await storage.get_module_data(MODULE_NAME, _KEY)
    return json.loads(raw) if raw else {"date": None, "count": 0}


async def get_today(storage: StorageManager) -> dict[str, Any]:
    """Read-only - if the stored date isn't today, reports 0 without
    writing anything (the write happens lazily on the next log_glass,
    matching how modules/room's config-driven state avoids writes with
    no actual change)."""
    stored = await _load(storage)
    today_iso = date.today().isoformat()
    if stored.get("date") != today_iso:
        return {"date": today_iso, "count": 0}
    return stored


async def log_glass(storage: StorageManager) -> dict[str, Any]:
    today = await get_today(storage)
    today["count"] += 1
    await storage.set_module_data(MODULE_NAME, _KEY, json.dumps(today))
    return today


async def reset_today(storage: StorageManager) -> dict[str, Any]:
    reset_state = {"date": date.today().isoformat(), "count": 0}
    await storage.set_module_data(MODULE_NAME, _KEY, json.dumps(reset_state))
    return reset_state
