"""The network module's backend. `router` and `on_load` are the only two
names the Module Manager looks for."""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import provider, status_to_payload

__all__ = ["router", "on_load"]

_DEFAULT_TICK_INTERVAL_SECONDS = 30
# Public IP rarely changes and the lookup is an external HTTP call - no
# need to hit it every tick. ~5 minutes at the default 30s tick interval.
_TICKS_PER_PUBLIC_IP_REFRESH = 10


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    provider.configure(config)
    interval = config.get("tickIntervalSeconds", _DEFAULT_TICK_INTERVAL_SECONDS)
    asyncio.create_task(_tick_forever(event_bus, interval))


async def _tick_forever(event_bus: EventBus, interval_seconds: float) -> None:
    tick_count = 0
    while True:
        await provider.refresh_latency()
        if tick_count % _TICKS_PER_PUBLIC_IP_REFRESH == 0:
            await provider.refresh_public_ip()
        await event_bus.publish(
            "network.updated", status_to_payload(provider.status()), source="network", retain=True
        )
        tick_count += 1
        await asyncio.sleep(interval_seconds)
