"""The AlexOS Event Bus.

This is the only channel modules ever use to react to one another. A
module publishes an event; it never imports or calls another module
directly. Subscribing to "*" receives every event - used by the
WebSocket gateway to forward the whole stream to connected clients.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import Any

EventEnvelope = dict[str, Any]
EventHandler = Callable[[EventEnvelope], Awaitable[None] | None]


class EventBus:
    def __init__(self) -> None:
        self._subscribers: dict[str, list[EventHandler]] = defaultdict(list)

    def subscribe(self, event_name: str, handler: EventHandler) -> Callable[[], None]:
        self._subscribers[event_name].append(handler)

        def unsubscribe() -> None:
            if handler in self._subscribers[event_name]:
                self._subscribers[event_name].remove(handler)

        return unsubscribe

    async def publish(self, event_name: str, payload: Any = None, source: str = "core") -> EventEnvelope:
        envelope: EventEnvelope = {
            "name": event_name,
            "payload": payload,
            "emittedAt": datetime.now(timezone.utc).isoformat(),
            "source": source,
        }
        handlers = [*self._subscribers.get(event_name, []), *self._subscribers.get("*", [])]
        for handler in handlers:
            result = handler(envelope)
            if asyncio.iscoroutine(result):
                await result
        return envelope
