import httpx
import pytest

import app.core.google_calendar as google_calendar


@pytest.mark.asyncio
async def test_returns_none_when_google_isnt_configured(monkeypatch) -> None:
    async def fake_get_access_token() -> str | None:
        return None

    monkeypatch.setattr(google_calendar.google_auth, "get_access_token", fake_get_access_token)

    result = await google_calendar.create_event("Vuelo IB1234", "2026-09-01T09:00:00", "2026-09-01T11:00:00", "Europe/Madrid")

    assert result is None


@pytest.mark.asyncio
async def test_creates_an_event_with_the_expected_payload(monkeypatch) -> None:
    async def fake_get_access_token() -> str | None:
        return "fake-access-token"

    monkeypatch.setattr(google_calendar.google_auth, "get_access_token", fake_get_access_token)

    seen = {}

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        seen["url"] = url
        seen["headers"] = headers
        seen["json"] = json
        return httpx.Response(200, json={"id": "abc123", "htmlLink": "https://calendar.google.com/x"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    result = await google_calendar.create_event(
        "Vuelo IB1234",
        "2026-09-01T09:00:00",
        "2026-09-01T11:00:00",
        "Europe/Madrid",
        description="Salida desde MAD",
    )

    assert result == {"id": "abc123", "htmlLink": "https://calendar.google.com/x"}
    assert seen["url"] == "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    assert seen["headers"] == {"Authorization": "Bearer fake-access-token"}
    assert seen["json"] == {
        "summary": "Vuelo IB1234",
        "description": "Salida desde MAD",
        "start": {"dateTime": "2026-09-01T09:00:00", "timeZone": "Europe/Madrid"},
        "end": {"dateTime": "2026-09-01T11:00:00", "timeZone": "Europe/Madrid"},
    }


@pytest.mark.asyncio
async def test_uses_a_custom_calendar_id_when_given(monkeypatch) -> None:
    async def fake_get_access_token() -> str | None:
        return "fake-access-token"

    monkeypatch.setattr(google_calendar.google_auth, "get_access_token", fake_get_access_token)

    seen = {}

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        seen["url"] = url
        return httpx.Response(200, json={"id": "x"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    await google_calendar.create_event(
        "Reunion", "2026-09-01T09:00:00", "2026-09-01T09:30:00", "UTC", calendar_id="work@group.calendar.google.com"
    )

    assert seen["url"] == "https://www.googleapis.com/calendar/v3/calendars/work%40group.calendar.google.com/events"
