"""The AI module's backend. Publishes from the route handler via
`request.app.state.event_bus` - no background work needed, so `on_load`
only configures the keyword rules from config.json."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import configure

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus
    configure(config)
