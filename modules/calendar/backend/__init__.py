"""The calendar module's backend. Now also polls periodically and
publishes `calendar.updated` (retained), so events created outside
AlexOS (in Google Calendar's own app, on your phone, ...) show up on
their own instead of requiring a manual browser reload - previously
this module only ever fetched on page load with no way to notice
external changes."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import CalendarConfigError, configure, event_to_payload, list_today_events

__all__ = ["router", "on_load"]

logger = logging.getLogger("alexos.modules.calendar")

_DEFAULT_TICK_INTERVAL_SECONDS = 120


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    configure(config)
    interval = config.get("tickIntervalSeconds", _DEFAULT_TICK_INTERVAL_SECONDS)
    asyncio.create_task(_tick_forever(event_bus, interval))


async def _tick_forever(event_bus: EventBus, interval_seconds: float) -> None:
    while True:
        try:
            events = await list_today_events()
            if events is not None:
                payload = {"configured": True, "events": [event_to_payload(event) for event in events]}
                await event_bus.publish("calendar.updated", payload, source="calendar", retain=True)
        except CalendarConfigError:
            logger.exception("Calendar misconfigured - check modules/calendar/config.json")
        except Exception:
            logger.exception("Failed to poll Google Calendar")
        await asyncio.sleep(interval_seconds)
