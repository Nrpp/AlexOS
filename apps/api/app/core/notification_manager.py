"""AlexOS Notification Manager.

The only way any module raises something for the user to see. It never
pushes to the frontend directly - it persists the notification and
publishes `notification.created` on the Event Bus; the WebSocket gateway
is just one more subscriber that happens to forward it to connected
clients.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.core.event_bus import EventBus
from app.core.storage_manager import StorageManager
from app.db.models import NotificationRecord
from app.models.schemas import Notification, NotificationPriority


class NotificationManager:
    def __init__(self, event_bus: EventBus, storage: StorageManager) -> None:
        self._event_bus = event_bus
        self._storage = storage

    async def notify(self, priority: NotificationPriority, title: str, message: str) -> Notification:
        notification = Notification(
            id=str(uuid.uuid4()),
            priority=priority,
            title=title,
            message=message,
            created_at=datetime.now(timezone.utc),
        )
        await self._storage.save_notification(
            NotificationRecord(
                id=notification.id,
                priority=notification.priority,
                title=notification.title,
                message=notification.message,
                created_at=notification.created_at,
            )
        )
        await self._event_bus.publish(
            "notification.created",
            notification.model_dump(mode="json", by_alias=True),
            source="notification_manager",
        )
        return notification
