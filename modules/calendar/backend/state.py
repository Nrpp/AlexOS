"""In-memory events list, seeded from config.json. Swap `configure()` for
something that fetches a real calendar source later - the router and
widget only ever see the same `{ time, title }` shape."""

from __future__ import annotations

from typing import Any

events: list[dict[str, Any]] = []


def configure(config: dict[str, Any]) -> None:
    events.clear()
    seeded = config.get("events", [])
    events.extend(sorted(seeded, key=lambda event: event.get("time", "")))
