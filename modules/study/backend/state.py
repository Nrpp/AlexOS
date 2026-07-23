"""Generic persisted-list helpers backing exams, homework, and to-dos.

All three are "a list of small JSON records the user adds/checks off/
removes" - stored as one JSON blob per list under the Core Storage
Manager's generic module-data table (`app.db.models.ModuleDataEntry`),
keyed by this module's name. No dedicated SQL table needed.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "study"


async def list_items(storage: StorageManager, list_name: str) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, list_name)
    return json.loads(raw) if raw else []


async def _save(storage: StorageManager, list_name: str, items: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, list_name, json.dumps(items))


async def create_item(storage: StorageManager, list_name: str, fields: dict[str, Any]) -> dict[str, Any]:
    items = await list_items(storage, list_name)
    item = {"id": str(uuid.uuid4()), **fields}
    items.append(item)
    await _save(storage, list_name, items)
    return item


async def update_item(
    storage: StorageManager, list_name: str, item_id: str, patch: dict[str, Any]
) -> dict[str, Any] | None:
    items = await list_items(storage, list_name)
    for item in items:
        if item["id"] == item_id:
            item.update(patch)
            await _save(storage, list_name, items)
            return item
    return None


async def delete_item(storage: StorageManager, list_name: str, item_id: str) -> bool:
    items = await list_items(storage, list_name)
    remaining = [item for item in items if item["id"] != item_id]
    if len(remaining) == len(items):
        return False
    await _save(storage, list_name, remaining)
    return True
