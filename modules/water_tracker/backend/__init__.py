"""The water tracker module's backend. No background polling - each
request reads/writes the persisted daily count directly."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import settings

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus
    settings.configure(config)
