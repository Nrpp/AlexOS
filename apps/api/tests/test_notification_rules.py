import pytest

from app.core.event_bus import EventBus
from app.core.notification_rules import register_notification_rules


class _RecordingNotificationManager:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, str]] = []

    async def notify(self, priority: str, title: str, message: str) -> None:
        self.calls.append((priority, title, message))


@pytest.mark.asyncio
async def test_mail_received_creates_an_information_notification() -> None:
    event_bus = EventBus()
    notification_manager = _RecordingNotificationManager()
    register_notification_rules(event_bus, notification_manager)  # type: ignore[arg-type]

    await event_bus.publish("mail.received", {"sender": "GitHub", "subject": "Your build passed"})

    assert notification_manager.calls == [("information", "New mail from GitHub", "Your build passed")]
