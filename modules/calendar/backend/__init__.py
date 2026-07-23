"""The calendar module's backend. Fetched fresh on every request - no
background polling, since there's nothing to push without webhook
support (a future improvement, not this pass)."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import configure

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus
    configure(config)
