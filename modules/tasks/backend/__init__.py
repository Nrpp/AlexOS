"""The tasks module's backend. Publishes events directly from route
handlers via `request.app.state.event_bus` - no background work needed,
so there's no `on_load` hook (entirely optional per the module
contract)."""

from __future__ import annotations

from .router import router

__all__ = ["router"]
