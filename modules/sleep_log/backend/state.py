"""Manual sleep log - one entry per calendar date (logging the same
date twice overwrites, rather than creating a duplicate, since "how
much did I sleep on the night of the 12th" only has one right answer).
Same generic module-data pattern as modules/habit_tracker (duplicated,
not shared - modules are independently loaded)."""

from __future__ import annotations

import json
import uuid
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "sleep_log"
_LIST_KEY = "entries"


async def list_entries(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    entries: list[dict[str, Any]] = json.loads(raw) if raw else []
    return sorted(entries, key=lambda e: e["date"], reverse=True)


async def _save(storage: StorageManager, entries: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(entries))


async def log_entry(storage: StorageManager, entry_date: str, hours: float, note: str = "") -> dict[str, Any]:
    entries = await list_entries(storage)
    existing = next((e for e in entries if e["date"] == entry_date), None)
    if existing:
        existing["hours"] = hours
        existing["note"] = note
        entry = existing
    else:
        entry = {"id": str(uuid.uuid4()), "date": entry_date, "hours": hours, "note": note}
        entries.append(entry)
    await _save(storage, entries)
    return entry


async def delete_entry(storage: StorageManager, entry_id: str) -> bool:
    entries = await list_entries(storage)
    remaining = [e for e in entries if e["id"] != entry_id]
    if len(remaining) == len(entries):
        return False
    await _save(storage, remaining)
    return True
