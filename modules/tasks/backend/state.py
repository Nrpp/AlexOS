"""Real Google Tasks integration. Shares the Google OAuth client with
modules/communication and modules/calendar - see
apps/api/app/core/google_auth.py and the module README."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from app.core.google_auth import google_auth

_API_BASE = "https://tasks.googleapis.com/tasks/v1"

# "@default" is Google's own alias for the user's default task list - no
# lookup call needed unless config.json overrides it.
_task_list_id = "@default"


def configure(config: dict[str, Any]) -> None:
    global _task_list_id
    _task_list_id = config.get("taskListId", _task_list_id)


@dataclass
class Task:
    id: str
    title: str
    completed: bool


def task_to_payload(task: Task) -> dict[str, Any]:
    return {"id": task.id, "title": task.title, "completed": task.completed}


def _task_from_item(item: dict[str, Any]) -> Task:
    return Task(id=item["id"], title=item.get("title", ""), completed=item.get("status") == "completed")


async def list_tasks() -> list[Task] | None:
    """None means Google Tasks isn't configured - distinct from an empty list."""
    access_token = await google_auth.get_access_token()
    if access_token is None:
        return None

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{_API_BASE}/lists/{_task_list_id}/tasks",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"showCompleted": "true", "showHidden": "true"},
        )
        response.raise_for_status()
        items = response.json().get("items", [])

    tasks = [_task_from_item(item) for item in items]
    tasks.sort(key=lambda task: task.completed)  # stable sort - incomplete first
    return tasks


async def create_task(title: str) -> Task | None:
    access_token = await google_auth.get_access_token()
    if access_token is None:
        return None
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{_API_BASE}/lists/{_task_list_id}/tasks",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"title": title},
        )
        response.raise_for_status()
        item = response.json()
    return _task_from_item(item)


async def set_completed(task_id: str, completed: bool) -> Task | None:
    access_token = await google_auth.get_access_token()
    if access_token is None:
        return None
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.patch(
            f"{_API_BASE}/lists/{_task_list_id}/tasks/{task_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"status": "completed" if completed else "needsAction"},
        )
        response.raise_for_status()
        item = response.json()
    return _task_from_item(item)
