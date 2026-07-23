"""The servers module's backend. `router` and `on_load` are the only two
names the Module Manager looks for."""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import provider, stats_to_payload

__all__ = ["router", "on_load"]

_DEFAULT_TICK_INTERVAL_SECONDS = 5


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    provider.configure(config)
    interval = config.get("tickIntervalSeconds", _DEFAULT_TICK_INTERVAL_SECONDS)
    asyncio.create_task(_tick_forever(event_bus, interval))


async def _tick_forever(event_bus: EventBus, interval_seconds: float) -> None:
    while True:
        await event_bus.publish(
            "server.metrics", stats_to_payload(provider.read()), source="servers", retain=True
        )
        await asyncio.sleep(interval_seconds)
