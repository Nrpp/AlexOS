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
        # Last-seen envelope per event name, for events published with
        # retain=True - so a newly-connected client doesn't have to wait
        # for the next tick to see current *state* (e.g. the Status
        # Bar's weather reading, which only ticks every 15 minutes).
        # Deliberately opt-in: a one-time *action* event like
        # mail.received or notification.created must never be retained,
        # or every fresh connection (every page refresh) would replay it
        # as if it just happened again - retain is for "what's true right
        # now," not "something that occurred once."
        self._last_by_name: dict[str, EventEnvelope] = {}

    def subscribe(self, event_name: str, handler: EventHandler) -> Callable[[], None]:
        self._subscribers[event_name].append(handler)

        def unsubscribe() -> None:
            if handler in self._subscribers[event_name]:
                self._subscribers[event_name].remove(handler)

        return unsubscribe

    def get_all_last(self) -> list[EventEnvelope]:
        return list(self._last_by_name.values())

    async def publish(
        self, event_name: str, payload: Any = None, source: str = "core", retain: bool = False
    ) -> EventEnvelope:
        envelope: EventEnvelope = {
            "name": event_name,
            "payload": payload,
            "emittedAt": datetime.now(timezone.utc).isoformat(),
            "source": source,
        }
        if retain:
            self._last_by_name[event_name] = envelope
        handlers = [*self._subscribers.get(event_name, []), *self._subscribers.get("*", [])]
        for handler in handlers:
            result = handler(envelope)
            if asyncio.iscoroutine(result):
                await result
        return envelope
