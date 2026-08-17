"""The flight_tracker module's backend. `router` and `on_load` are the
only two names the Module Manager looks for."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import configure

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus
    configure(config)
