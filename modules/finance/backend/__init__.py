"""The finance module's backend. Static seed data - no on_load background
work needed, same reasoning as the calendar module."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import configure

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus
    configure(config)
