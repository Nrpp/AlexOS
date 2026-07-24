"""Real, persisted habit tracker with real streak counting (based on
actual calendar dates, not just an incrementing counter). Same generic
module-data pattern as modules/study/notes (duplicated, not shared -
modules are independently loaded)."""

from __future__ import annotations

import json
import uuid
from datetime import date, timedelta
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "habit_tracker"
_LIST_KEY = "habits"


async def list_habits(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    return json.loads(raw) if raw else []


async def _save(storage: StorageManager, habits: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(habits))


async def create_habit(storage: StorageManager, name: str) -> dict[str, Any]:
    habits = await list_habits(storage)
    habit = {"id": str(uuid.uuid4()), "name": name, "streak": 0, "lastCheckedDate": None}
    habits.append(habit)
    await _save(storage, habits)
    return habit


def _apply_check_in(habit: dict[str, Any], today: date) -> dict[str, Any]:
    last_checked = habit.get("lastCheckedDate")
    today_iso = today.isoformat()
    if last_checked == today_iso:
        return habit  # already checked in today - no-op, not a double-count
    yesterday_iso = (today - timedelta(days=1)).isoformat()
    habit["streak"] = habit.get("streak", 0) + 1 if last_checked == yesterday_iso else 1
    habit["lastCheckedDate"] = today_iso
    return habit


async def check_in(storage: StorageManager, habit_id: str) -> dict[str, Any] | None:
    habits = await list_habits(storage)
    for habit in habits:
        if habit["id"] == habit_id:
            _apply_check_in(habit, date.today())
            await _save(storage, habits)
            return habit
    return None


async def delete_habit(storage: StorageManager, habit_id: str) -> bool:
    habits = await list_habits(storage)
    remaining = [habit for habit in habits if habit["id"] != habit_id]
    if len(remaining) == len(habits):
        return False
    await _save(storage, remaining)
    return True
