"""The tasks module's backend. Publishes task.created/task.completed
from route handlers via `request.app.state.event_bus` for instant
feedback on actions taken through AlexOS itself, and also polls
periodically to publish `tasks.updated` (retained) - so a task added or
completed outside AlexOS (Google Tasks' own app, another device, ...)
shows up on its own instead of requiring a manual browser reload."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from app.core.event_bus import EventBus

from .router import router
from .state import configure, list_tasks, task_to_payload

__all__ = ["router", "on_load"]

logger = logging.getLogger("alexos.modules.tasks")

_DEFAULT_TICK_INTERVAL_SECONDS = 60


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    configure(config)
    interval = config.get("tickIntervalSeconds", _DEFAULT_TICK_INTERVAL_SECONDS)
    asyncio.create_task(_tick_forever(event_bus, interval))


async def _tick_forever(event_bus: EventBus, interval_seconds: float) -> None:
    while True:
        try:
            tasks = await list_tasks()
            if tasks is not None:
                payload = {"configured": True, "tasks": [task_to_payload(task) for task in tasks]}
                await event_bus.publish("tasks.updated", payload, source="tasks", retain=True)
        except httpx.HTTPError:
            logger.exception("Failed to poll Google Tasks")
        await asyncio.sleep(interval_seconds)
