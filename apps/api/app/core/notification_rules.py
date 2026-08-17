"""Maps specific Event Bus events to real notifications, so modules
never need their own notify() call - they just publish their normal
domain event, and Core decides which ones are notification-worthy.
Add more rules here as more modules earn one; don't special-case
notifications inside a module's own code."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus
from app.core.notification_manager import NotificationManager


def register_notification_rules(event_bus: EventBus, notification_manager: NotificationManager) -> None:
    async def on_mail_received(envelope: dict[str, Any]) -> None:
        payload = envelope.get("payload") or {}
        sender = payload.get("sender", "someone")
        subject = payload.get("subject", "")
        await notification_manager.notify("information", f"New mail from {sender}", subject)

    event_bus.subscribe("mail.received", on_mail_received)

    async def on_alex_notification(envelope: dict[str, Any]) -> None:
        payload = envelope.get("payload") or {}
        await notification_manager.notify(
            payload.get("priority", "information"),
            payload.get("title", "Alex"),
            payload.get("message", ""),
        )

    event_bus.subscribe("alex_assistant.notification", on_alex_notification)

    async def on_alarm_triggered(envelope: dict[str, Any]) -> None:
        payload = envelope.get("payload") or {}
        await notification_manager.notify("critical", "Alarm", payload.get("label", "Alarm"))

    event_bus.subscribe("alarms.triggered", on_alarm_triggered)
