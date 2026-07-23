"""The calendar module's backend. Static seed data for this milestone -
no tick loop needed since nothing changes on its own."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import configure

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus  # No live source yet - nothing to publish.
    configure(config)
