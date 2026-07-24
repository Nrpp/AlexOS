"""Real, persisted notes - title + body, stored via the Core Storage
Manager's generic module-data table (same small pattern as
modules/study/backend/state.py, duplicated rather than shared since
modules are independently loaded and don't import each other)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "notes"
_LIST_KEY = "notes"


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def list_notes(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    notes: list[dict[str, Any]] = json.loads(raw) if raw else []
    return sorted(notes, key=lambda note: note["updatedAt"], reverse=True)


async def _save(storage: StorageManager, notes: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(notes))


async def create_note(storage: StorageManager, title: str, body: str) -> dict[str, Any]:
    notes = await list_notes(storage)
    note = {"id": str(uuid.uuid4()), "title": title, "body": body, "updatedAt": _utcnow_iso()}
    notes.append(note)
    await _save(storage, notes)
    return note


async def update_note(storage: StorageManager, note_id: str, title: str, body: str) -> dict[str, Any] | None:
    notes = await list_notes(storage)
    for note in notes:
        if note["id"] == note_id:
            note["title"] = title
            note["body"] = body
            note["updatedAt"] = _utcnow_iso()
            await _save(storage, notes)
            return note
    return None


async def delete_note(storage: StorageManager, note_id: str) -> bool:
    notes = await list_notes(storage)
    remaining = [note for note in notes if note["id"] != note_id]
    if len(remaining) == len(notes):
        return False
    await _save(storage, remaining)
    return True
