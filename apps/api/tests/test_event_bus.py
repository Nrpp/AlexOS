import pytest

from app.core.event_bus import EventBus


@pytest.mark.asyncio
async def test_retained_events_return_most_recent_envelope_per_name() -> None:
    bus = EventBus()

    await bus.publish("weather.updated", {"temperature": 18}, retain=True)
    await bus.publish("clock.tick", {"iso": "2026-01-01T00:00:00Z"}, retain=True)
    await bus.publish("weather.updated", {"temperature": 19}, retain=True)

    last = {envelope["name"]: envelope["payload"] for envelope in bus.get_all_last()}

    assert last == {
        "weather.updated": {"temperature": 19},
        "clock.tick": {"iso": "2026-01-01T00:00:00Z"},
    }


@pytest.mark.asyncio
async def test_get_all_last_is_empty_before_any_publish() -> None:
    bus = EventBus()

    assert bus.get_all_last() == []


@pytest.mark.asyncio
async def test_publish_without_retain_is_not_replayed() -> None:
    """One-time action events (mail.received, notification.created, ...)
    must never be retained - a fresh connection replaying them would
    look like the action just happened again."""
    bus = EventBus()

    await bus.publish("mail.received", {"sender": "GitHub"})

    assert bus.get_all_last() == []
