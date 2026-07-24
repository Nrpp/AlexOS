"""The RSS reader module's backend. No background polling - each
request fetches fresh; headline feeds don't need push-style updates
for a widget someone glances at occasionally."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import provider

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus
    provider.configure(config)
