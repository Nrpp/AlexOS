"""The communication module's backend. `router` and `on_load` are the
only two names the Module Manager looks for."""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import message_to_payload, simulate_new_message

__all__ = ["router", "on_load"]

_DEFAULT_INTERVAL_SECONDS = 120


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    interval = config.get("newMessageIntervalSeconds", _DEFAULT_INTERVAL_SECONDS)
    asyncio.create_task(_simulate_forever(event_bus, interval))


async def _simulate_forever(event_bus: EventBus, interval_seconds: float) -> None:
    while True:
        await asyncio.sleep(interval_seconds)
        message = simulate_new_message()
        await event_bus.publish("mail.received", message_to_payload(message), source="communication")
