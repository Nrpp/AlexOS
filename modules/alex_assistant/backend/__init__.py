"""The alex_assistant module's backend. `router` and `on_load` are the
only two names the Module Manager looks for - everything else is this
module's own business."""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.event_bus import EventBus

from .connection import connection_loop, status_poll_loop
from .router import router
from .state import client

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    client.configure(config)
    asyncio.create_task(connection_loop(event_bus, client))
    asyncio.create_task(status_poll_loop(event_bus, client))
