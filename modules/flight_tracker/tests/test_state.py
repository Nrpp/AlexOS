import asyncio
import importlib.util
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_flight_tracker_state"
_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_state():
    # state.py imports `app.core.google_calendar` (which imports
    # `app.core.google_auth`) - only importable once apps/api is on
    # sys.path, which isn't the case when pytest runs from the repo
    # root (testpaths = ["modules"], see pyproject.toml).
    api_root = str(_REPO_ROOT / "apps" / "api")
    if api_root not in sys.path:
        sys.path.insert(0, api_root)

    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _STATE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_state()


class FakeStorageManager:
    def __init__(self) -> None:
        self._data: dict[tuple[str, str], str] = {}

    async def get_module_data(self, module: str, key: str) -> str | None:
        return self._data.get((module, key))

    async def set_module_data(self, module: str, key: str, value: str) -> None:
        self._data[(module, key)] = value


def test_tracking_url_strips_spaces_and_uppercases() -> None:
    assert state.tracking_url("ib 1234") == "https://www.flightaware.com/live/flight/IB1234"


def test_create_flight_saves_even_when_google_isnt_configured(monkeypatch) -> None:
    async def fake_create_event(*args, **kwargs):
        return None

    monkeypatch.setattr(state, "create_event", fake_create_event)

    async def scenario():
        storage = FakeStorageManager()
        return await state.create_flight(storage, "IB1234", "2026-09-01T09:00:00", None, "Iberia", "", )

    flight = asyncio.run(scenario())
    assert flight["calendarEventCreated"] is False
    assert flight["trackingUrl"] == "https://www.flightaware.com/live/flight/IB1234"


def test_create_flight_marks_calendar_event_created_when_google_is_configured(monkeypatch) -> None:
    seen = {}

    async def fake_create_event(summary, start_iso, end_iso, timezone, *, calendar_id="primary", description=""):
        seen["summary"] = summary
        seen["start_iso"] = start_iso
        seen["end_iso"] = end_iso
        seen["timezone"] = timezone
        seen["description"] = description
        return {"id": "evt123"}

    monkeypatch.setattr(state, "create_event", fake_create_event)
    state.configure({"timezone": "Europe/Madrid"})

    async def scenario():
        storage = FakeStorageManager()
        return await state.create_flight(storage, "IB1234", "2026-09-01T09:00:00", None, "Iberia", "Gate B12")

    flight = asyncio.run(scenario())
    assert flight["calendarEventCreated"] is True
    assert seen["summary"] == "Flight IB1234"
    assert seen["start_iso"] == "2026-09-01T09:00:00"
    assert seen["end_iso"] == "2026-09-01T11:00:00"  # default 2h duration, no arrival given
    assert seen["timezone"] == "Europe/Madrid"
    assert "Iberia" in seen["description"]
    assert "Gate B12" in seen["description"]


def test_create_flight_uses_arrival_time_as_event_end_when_given(monkeypatch) -> None:
    seen = {}

    async def fake_create_event(summary, start_iso, end_iso, timezone, *, calendar_id="primary", description=""):
        seen["end_iso"] = end_iso
        return {"id": "evt123"}

    monkeypatch.setattr(state, "create_event", fake_create_event)

    async def scenario():
        storage = FakeStorageManager()
        return await state.create_flight(
            storage, "IB1234", "2026-09-01T09:00:00", "2026-09-01T12:30:00", "", ""
        )

    asyncio.run(scenario())
    assert seen["end_iso"] == "2026-09-01T12:30:00"


def test_delete_flight(monkeypatch) -> None:
    async def fake_create_event(*args, **kwargs):
        return None

    monkeypatch.setattr(state, "create_event", fake_create_event)

    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_flight(storage, "IB1234", "2026-09-01T09:00:00", None, "", "")
        deleted = await state.delete_flight(storage, created["id"])
        remaining = await state.list_flights(storage)
        return deleted, remaining

    deleted, remaining = asyncio.run(scenario())
    assert deleted is True
    assert remaining == []
