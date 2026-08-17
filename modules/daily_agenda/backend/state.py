"""A quick local agenda, entries scoped to a calendar date. Same
generic module-data pattern as modules/habit_tracker (duplicated, not
shared - modules are independently loaded)."""

from __future__ import annotations

import json
import uuid
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "daily_agenda"
_LIST_KEY = "entries"


async def _all_entries(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    return json.loads(raw) if raw else []


async def _save(storage: StorageManager, entries: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(entries))


async def list_entries_for_date(storage: StorageManager, entry_date: str) -> list[dict[str, Any]]:
    entries = [e for e in await _all_entries(storage) if e["date"] == entry_date]
    return sorted(entries, key=lambda e: e["time"])


async def create_entry(storage: StorageManager, entry_date: str, time_str: str, text: str) -> dict[str, Any]:
    entries = await _all_entries(storage)
    entry = {"id": str(uuid.uuid4()), "date": entry_date, "time": time_str, "text": text}
    entries.append(entry)
    await _save(storage, entries)
    return entry


async def delete_entry(storage: StorageManager, entry_id: str) -> bool:
    entries = await _all_entries(storage)
    remaining = [e for e in entries if e["id"] != entry_id]
    if len(remaining) == len(entries):
        return False
    await _save(storage, remaining)
    return True
