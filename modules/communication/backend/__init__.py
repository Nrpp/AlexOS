"""The communication module's backend. `router` and `on_load` are the
only two names the Module Manager looks for."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import message_to_payload, poll_for_new_messages

__all__ = ["router", "on_load"]

logger = logging.getLogger("alexos.modules.communication")

_DEFAULT_POLL_INTERVAL_SECONDS = 120


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    interval = config.get("pollIntervalSeconds", _DEFAULT_POLL_INTERVAL_SECONDS)
    asyncio.create_task(_poll_forever(event_bus, interval))


async def _poll_forever(event_bus: EventBus, interval_seconds: float) -> None:
    while True:
        try:
            for message in await poll_for_new_messages():
                await event_bus.publish("mail.received", message_to_payload(message), source="communication")
        except Exception:
            logger.exception("Failed to poll Gmail")
        await asyncio.sleep(interval_seconds)
