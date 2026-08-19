"""The presence module's backend. Everything here is driven by an
inbound webhook call or a Settings action - no background work, so
`on_load` only hands config.json's tunables to `config_store` for the
route handlers to read later (same reasoning as modules/room's
`client.configure(config)`)."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .config_store import configure
from .router import router

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    del event_bus
    configure(config)
