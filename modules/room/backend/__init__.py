"""The room module's backend. Publishes from route handlers via
`request.app.state.event_bus` - no background work needed, so `on_load`
only loads the configured light entity IDs from config.json."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import client

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus
    client.configure(config)
