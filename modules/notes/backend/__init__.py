"""The notes module's backend. Publishes from route handlers via
`request.app.state.event_bus` - no background work needed, so there's
no on_load. Notes are only ever created/edited through AlexOS itself
(unlike Google Tasks/Calendar), so there's no external source to poll."""

from __future__ import annotations

from .router import router

__all__ = ["router"]
