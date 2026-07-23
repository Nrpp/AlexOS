"""The media module's backend. `router` and `on_load` are the only two
names the Module Manager looks for."""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import player, state_to_payload

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    player.configure(config)
    asyncio.create_task(_tick_forever(event_bus))


async def _tick_forever(event_bus: EventBus) -> None:
    while True:
        await asyncio.sleep(1)
        if player.tick():
            await event_bus.publish("media.updated", state_to_payload(player), source="media")
