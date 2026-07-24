"""Real, persisted reading list - title, author, status. Same generic
module-data pattern as modules/study and modules/notes (duplicated
rather than shared - modules are independently loaded and don't import
each other)."""

from __future__ import annotations

import json
import uuid
from typing import Any

from app.core.storage_manager import StorageManager

MODULE_NAME = "reading_list"
_LIST_KEY = "books"


async def list_books(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    return json.loads(raw) if raw else []


async def _save(storage: StorageManager, books: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(books))


async def create_book(storage: StorageManager, title: str, author: str) -> dict[str, Any]:
    books = await list_books(storage)
    book = {"id": str(uuid.uuid4()), "title": title, "author": author, "status": "want"}
    books.append(book)
    await _save(storage, books)
    return book


async def update_status(storage: StorageManager, book_id: str, status: str) -> dict[str, Any] | None:
    books = await list_books(storage)
    for book in books:
        if book["id"] == book_id:
            book["status"] = status
            await _save(storage, books)
            return book
    return None


async def delete_book(storage: StorageManager, book_id: str) -> bool:
    books = await list_books(storage)
    remaining = [book for book in books if book["id"] != book_id]
    if len(remaining) == len(books):
        return False
    await _save(storage, remaining)
    return True
