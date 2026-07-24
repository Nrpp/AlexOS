"""Real, persisted bookmarks - title + URL. Same generic module-data
pattern as modules/study/notes (duplicated, not shared - modules are
independently loaded)."""

from __future__ import annotations

import json
import uuid
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "bookmarks"
_LIST_KEY = "bookmarks"


async def list_bookmarks(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    return json.loads(raw) if raw else []


async def _save(storage: StorageManager, bookmarks: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(bookmarks))


async def create_bookmark(storage: StorageManager, title: str, url: str) -> dict[str, Any]:
    bookmarks = await list_bookmarks(storage)
    bookmark = {"id": str(uuid.uuid4()), "title": title, "url": url}
    bookmarks.append(bookmark)
    await _save(storage, bookmarks)
    return bookmark


async def delete_bookmark(storage: StorageManager, bookmark_id: str) -> bool:
    bookmarks = await list_bookmarks(storage)
    remaining = [bookmark for bookmark in bookmarks if bookmark["id"] != bookmark_id]
    if len(remaining) == len(bookmarks):
        return False
    await _save(storage, remaining)
    return True
