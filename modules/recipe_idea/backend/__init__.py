"""The recipe idea module's backend. No on_load needed - purely
request-driven."""

from __future__ import annotations

from .router import router

__all__ = ["router"]
