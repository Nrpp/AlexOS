"""Countdown targets - just a name and a target datetime, nothing else.
Same generic module-data pattern as modules/habit_tracker (duplicated,
not shared - modules are independently loaded)."""

from __future__ import annotations

import json
import uuid
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "countdown"
_LIST_KEY = "countdowns"


async def list_countdowns(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    countdowns: list[dict[str, Any]] = json.loads(raw) if raw else []
    return sorted(countdowns, key=lambda c: c["targetIso"])


async def _save(storage: StorageManager, countdowns: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(countdowns))


async def create_countdown(storage: StorageManager, title: str, target_iso: str) -> dict[str, Any]:
    countdowns = await list_countdowns(storage)
    countdown = {"id": str(uuid.uuid4()), "title": title, "targetIso": target_iso}
    countdowns.append(countdown)
    await _save(storage, countdowns)
    return countdown


async def delete_countdown(storage: StorageManager, countdown_id: str) -> bool:
    countdowns = await list_countdowns(storage)
    remaining = [c for c in countdowns if c["id"] != countdown_id]
    if len(remaining) == len(countdowns):
        return False
    await _save(storage, remaining)
    return True
