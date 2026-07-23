"""The study module's backend. Persists exams/homework/to-dos through
the Core Storage Manager (via `request.app.state.storage_manager` in
route handlers) - no `on_load` needed, there's no background work."""

from __future__ import annotations

from .router import router

__all__ = ["router"]
