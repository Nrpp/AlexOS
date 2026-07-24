"""The GitHub activity module's backend. No background polling - each
request fetches fresh, and GitHub's own API is already rate-limited
without a key, so a tick loop would burn through that budget for no
benefit on a page that isn't always open."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import provider

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus
    provider.configure(config)
