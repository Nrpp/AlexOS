"""Background tasks for the alex_assistant module: a persistent WebSocket
connection to Proyect-ALEX (forwarding its push notifications as AlexOS
events, with reconnect/backoff) and a periodic health poll - Proyect-
ALEX's WS only pushes notifications and chat replies, never status, so
that needs its own poll (see its alex/server/ws.py)."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import websockets

from app.core.event_bus import EventBus

from .state import AlexAssistantClient, map_priority

log = logging.getLogger(__name__)


async def connection_loop(event_bus: EventBus, client: AlexAssistantClient) -> None:
    if not client.is_configured:
        await event_bus.publish(
            "alex_assistant.connection",
            {"configured": False, "connected": False},
            source="alex_assistant",
            retain=True,
        )
        return

    delay = client.reconnect_min_delay_seconds
    while True:
        try:
            async with websockets.connect(client.ws_url, open_timeout=10) as ws:
                delay = client.reconnect_min_delay_seconds
                await event_bus.publish(
                    "alex_assistant.connection",
                    {"configured": True, "connected": True},
                    source="alex_assistant",
                    retain=True,
                )
                async for raw in ws:
                    await _handle_message(event_bus, raw)
        except Exception as error:
            log.warning("Lost connection to Alex (%s) - retrying in %.0fs", error, delay)
            await event_bus.publish(
                "alex_assistant.connection",
                {"configured": True, "connected": False},
                source="alex_assistant",
                retain=True,
            )
            await asyncio.sleep(delay)
            delay = min(delay * 2, client.reconnect_max_delay_seconds)


async def _handle_message(event_bus: EventBus, raw: str) -> None:
    try:
        data = json.loads(raw)
    except ValueError:
        return
    if data.get("type") != "notification":
        return
    notification = data.get("notification") or {}
    payload: dict[str, Any] = {
        "id": notification.get("id"),
        "source": notification.get("source", "alex"),
        "title": notification.get("title", "Alex"),
        "message": notification.get("body", ""),
        "priority": map_priority(int(notification.get("priority", 1))),
        "actions": notification.get("actions", []),
    }
    await event_bus.publish("alex_assistant.notification", payload, source="alex_assistant")


async def status_poll_loop(event_bus: EventBus, client: AlexAssistantClient) -> None:
    if not client.is_configured:
        await event_bus.publish(
            "alex_assistant.status",
            {"configured": False, "reachable": False},
            source="alex_assistant",
            retain=True,
        )
        return

    while True:
        try:
            health = await client.fetch_status()
            await event_bus.publish(
                "alex_assistant.status",
                {"configured": True, "reachable": True, **health},
                source="alex_assistant",
                retain=True,
            )
        except Exception as error:
            log.warning("Couldn't reach Alex for a status check: %s", error)
            await event_bus.publish(
                "alex_assistant.status",
                {"configured": True, "reachable": False},
                source="alex_assistant",
                retain=True,
            )
        await asyncio.sleep(client.status_poll_interval_seconds)
