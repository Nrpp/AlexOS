"""The tasks module's backend. Publishes from route handlers via
`request.app.state.event_bus` - no background work needed, so there's
no on_load beyond loading config."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import configure

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus
    configure(config)
