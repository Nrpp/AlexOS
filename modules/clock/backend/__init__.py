"""The clock module's backend. `router` and `on_load` are the only two
names the Module Manager looks for - everything else is this module's
own business."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from app.core.event_bus import EventBus

from .router import router

__all__ = ["router", "on_load"]

_DEFAULT_TICK_INTERVAL_SECONDS = 1


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    """Called once by the Module Manager after import - the only handle
    this module ever gets to the Event Bus and to its own config.json."""
    interval = config.get("tickIntervalSeconds", _DEFAULT_TICK_INTERVAL_SECONDS)
    asyncio.create_task(_tick_forever(event_bus, interval))


async def _tick_forever(event_bus: EventBus, interval_seconds: float) -> None:
    while True:
        await event_bus.publish(
            "clock.tick",
            {"iso": datetime.now(timezone.utc).isoformat()},
            source="clock",
        )
        await asyncio.sleep(interval_seconds)
