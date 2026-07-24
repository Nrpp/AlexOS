"""The astronomy photo module's backend. No on_load needed - purely
request-driven, and the picture only changes once a day anyway."""

from __future__ import annotations

from .router import router

__all__ = ["router"]
