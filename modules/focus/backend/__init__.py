"""The focus module's backend. `router` and `on_load` are the only two
names the Module Manager looks for. `on_load` also starts a background
tick so a session auto-ends (and still fires `focus.ended` + webhooks)
even if nothing ever calls POST /stop."""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import fire_webhooks, manager, session_to_payload

__all__ = ["router", "on_load"]

_TICK_SECONDS = 5


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    manager.configure(config)
    asyncio.create_task(_tick_forever(event_bus))


async def _tick_forever(event_bus: EventBus) -> None:
    while True:
        await asyncio.sleep(_TICK_SECONDS)
        if manager.is_expired:
            session = manager.stop()
            payload = session_to_payload(session)
            await event_bus.publish("focus.ended", payload, source="focus", retain=True)
            await fire_webhooks("ended", payload, manager.webhook_timeout_seconds)
