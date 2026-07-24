"""The control center module's backend. Everything here is on-demand,
driven by user action in Settings - no background work, so no on_load
beyond exposing `router`."""

from __future__ import annotations

from .router import router

__all__ = ["router"]
