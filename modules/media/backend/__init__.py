"""The media module's backend. `router` and `on_load` are the only two
names the Module Manager looks for."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import SpotifyAuthExpiredError, now_playing

__all__ = ["router", "on_load"]

log = logging.getLogger("alexos.modules.media")

_DEFAULT_POLL_INTERVAL_SECONDS = 3


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    interval = config.get("pollIntervalSeconds", _DEFAULT_POLL_INTERVAL_SECONDS)
    asyncio.create_task(_poll_forever(event_bus, interval))


async def _poll_forever(event_bus: EventBus, interval_seconds: float) -> None:
    last_payload: dict[str, Any] | None = None
    while True:
        try:
            payload = await now_playing()
            if payload != last_payload:
                last_payload = payload
                await event_bus.publish("media.updated", payload, source="media", retain=True)
        except SpotifyAuthExpiredError as error:
            log.warning(str(error))
        except Exception:
            log.exception("Failed to poll Spotify")
        await asyncio.sleep(interval_seconds)
