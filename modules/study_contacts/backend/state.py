"""Real, persisted study contacts - name + subject + contactInfo. Same
generic module-data pattern as modules/shopping_list (duplicated, not
shared - modules are independently loaded)."""

from __future__ import annotations

import json
import uuid
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "study_contacts"
_LIST_KEY = "items"


async def list_items(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    return json.loads(raw) if raw else []


async def _save(storage: StorageManager, items: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(items))


async def create_item(storage: StorageManager, name: str, subject: str, contact_info: str) -> dict[str, Any]:
    items = await list_items(storage)
    item = {"id": str(uuid.uuid4()), "name": name, "subject": subject, "contactInfo": contact_info}
    items.append(item)
    await _save(storage, items)
    return item


async def update_item(storage: StorageManager, item_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    items = await list_items(storage)
    for item in items:
        if item["id"] == item_id:
            item.update(updates)
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
