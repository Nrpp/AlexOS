"""The weather module's backend. `router` and `on_load` are the only two
names the Module Manager looks for."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import provider, reading_to_payload

__all__ = ["router", "on_load"]

logger = logging.getLogger("alexos.modules.weather")

# Real weather doesn't need frequent polling - 15 minutes is plenty and
# stays well within Open-Meteo's free-tier rate limits.
_DEFAULT_TICK_INTERVAL_SECONDS = 900


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    provider.configure(config)
    interval = config.get("tickIntervalSeconds", _DEFAULT_TICK_INTERVAL_SECONDS)
    asyncio.create_task(_tick_forever(event_bus, interval))


async def _tick_forever(event_bus: EventBus, interval_seconds: float) -> None:
    while True:
        try:
            reading = await provider.read()
            await event_bus.publish("weather.updated", reading_to_payload(reading), source="weather")
        except Exception:
            logger.exception("Failed to fetch weather")
        await asyncio.sleep(interval_seconds)
