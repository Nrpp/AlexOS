"""Real, persisted shopping list - title + checked. Same generic
module-data pattern as modules/study/notes (duplicated, not shared -
modules are independently loaded)."""

from __future__ import annotations

import json
import uuid
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "shopping_list"
_LIST_KEY = "items"


async def list_items(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    return json.loads(raw) if raw else []


async def _save(storage: StorageManager, items: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(items))


async def create_item(storage: StorageManager, title: str) -> dict[str, Any]:
    items = await list_items(storage)
    item = {"id": str(uuid.uuid4()), "title": title, "checked": False}
    items.append(item)
    await _save(storage, items)
    return item


async def toggle_item(storage: StorageManager, item_id: str, checked: bool) -> dict[str, Any] | None:
    items = await list_items(storage)
    for item in items:
        if item["id"] == item_id:
            item["checked"] = checked
            await _save(storage, items)
            return item
    return None


async def delete_item(storage: StorageManager, item_id: str) -> bool:
    items = await list_items(storage)
    remaining = [item for item in items if item["id"] != item_id]
    if len(remaining) == len(items):
        return False
    await _save(storage, remaining)
    return True


async def clear_checked(storage: StorageManager) -> None:
    items = await list_items(storage)
    await _save(storage, [item for item in items if not item["checked"]])
