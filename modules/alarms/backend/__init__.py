"""The alarms module's backend. `router` and `on_load` are the only two
names the Module Manager looks for.

on_load() starts a tick that checks alarms against the current time via
a self-request to this module's own router (see state.py's docstring
for why - on_load() never receives the StorageManager) and publishes
alarms.triggered for anything due, which
apps/api/app/core/notification_rules.py maps to a real AlexOS
notification."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any

import httpx

from app.core.event_bus import EventBus
from app.settings import get_settings

from .router import router
from .state import due_alarms

__all__ = ["router", "on_load"]

log = logging.getLogger("alexos.modules.alarms")

_DEFAULT_CHECK_INTERVAL_SECONDS = 30


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    interval = config.get("checkIntervalSeconds", _DEFAULT_CHECK_INTERVAL_SECONDS)
    asyncio.create_task(_tick_forever(event_bus, interval))


async def _tick_forever(event_bus: EventBus, interval_seconds: float) -> None:
    settings = get_settings()
    base_url = f"http://127.0.0.1:{settings.api_port}"
    # alarm_id -> date ("YYYY-MM-DD") it last fired on - purely in-memory,
    # same tradeoff modules/communication makes for "seen" mail (resets on
    # restart; a restart mid-minute could in theory re-fire something that
    # already fired seconds earlier that same day - acceptable, rare, and
    # far simpler than a second DB connection just for this).
    fired_today: dict[str, str] = {}

    while True:
        try:
            now = datetime.now()
            current_hhmm = now.strftime("%H:%M")
            today = now.strftime("%Y-%m-%d")

            async with httpx.AsyncClient(base_url=base_url, timeout=10.0) as client:
                response = await client.get("/api/v1/modules/alarms/alarms")
                response.raise_for_status()
                alarms = response.json()

            for alarm in due_alarms(alarms, current_hhmm, today, fired_today):
                fired_today[alarm["id"]] = today
                await event_bus.publish("alarms.triggered", {"label": alarm.get("label", "Alarm")}, source="alarms")
        except Exception:
            log.exception("Alarm tick failed")

        await asyncio.sleep(interval_seconds)
