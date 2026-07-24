"""The air quality module's backend. No background polling needed -
each request fetches a fresh reading, and air quality doesn't change
fast enough to justify a tick loop for a glanceable widget."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import provider

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus
    provider.configure(config)
