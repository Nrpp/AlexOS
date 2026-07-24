"""The reading list module's backend. Publishes nothing - the widget
refetches directly after its own mutations, and nothing external can
change this data (see modules/notes for the same reasoning)."""

from __future__ import annotations

from .router import router

__all__ = ["router"]
