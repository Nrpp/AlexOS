"""The Tailscale module's backend. Ticks periodically and publishes
`tailscale.updated` (retained) so a peer coming online/offline shows up
without a manual page reload - same reasoning as modules/network."""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import get_status

__all__ = ["router", "on_load"]

_DEFAULT_TICK_INTERVAL_SECONDS = 30


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    interval = config.get("tickIntervalSeconds", _DEFAULT_TICK_INTERVAL_SECONDS)
    asyncio.create_task(_tick_forever(event_bus, interval))


async def _tick_forever(event_bus: EventBus, interval_seconds: float) -> None:
    while True:
        status = await get_status()
        if status is None:
            payload = {"available": False, "backendState": None, "self": None, "peers": []}
        else:
            payload = {"available": True, **status}
        await event_bus.publish("tailscale.updated", payload, source="tailscale", retain=True)
        await asyncio.sleep(interval_seconds)
