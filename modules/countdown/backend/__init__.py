"""The countdown module's backend. No on_load needed - purely
request-driven, same as habit_tracker/notes."""

from __future__ import annotations

from .router import router

__all__ = ["router"]
