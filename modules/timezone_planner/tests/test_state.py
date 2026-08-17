import asyncio
import importlib.util
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_timezone_planner_state"
_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_state():
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


def test_convert_times_across_zones() -> None:
    # 12:00 in Madrid (CEST, UTC+2 in August) is 06:00 in New York (EDT, UTC-4) and 19:00 in Tokyo (UTC+9, no DST).
    zones = [{"name": "America/New_York", "label": "NYC"}, {"name": "Asia/Tokyo", "label": "Tokyo"}]
    conversions = state.convert_times("Europe/Madrid", "2026-08-17T12:00:00", zones)

    by_name = {c["name"]: c["localTime"] for c in conversions}
    assert by_name["America/New_York"] == "2026-08-17 06:00"
    assert by_name["Asia/Tokyo"] == "2026-08-17 19:00"


def test_convert_times_falls_back_to_zone_name_when_no_label() -> None:
    zones = [{"name": "UTC"}]
    conversions = state.convert_times("Europe/Madrid", "2026-08-17T12:00:00", zones)
    assert conversions[0]["label"] == "UTC"


def test_add_list_remove_zone() -> None:
    async def scenario():
        storage = FakeStorageManager()
        zone = await state.add_zone(storage, "America/New_York", "NYC")
        listed = await state.list_zones(storage)
        removed = await state.remove_zone(storage, zone["id"])
        remaining = await state.list_zones(storage)
        return zone, listed, removed, remaining

    zone, listed, removed, remaining = asyncio.run(scenario())
    assert zone["label"] == "NYC"
    assert len(listed) == 1
    assert removed is True
    assert remaining == []


def test_add_zone_defaults_label_to_name_when_blank() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.add_zone(storage, "America/New_York", "")

    zone = asyncio.run(scenario())
    assert zone["label"] == "America/New_York"


def test_convert_for_saved_zones_uses_the_configured_base_timezone() -> None:
    state.configure({"baseTimezone": "Europe/Madrid"})

    async def scenario():
        storage = FakeStorageManager()
        await state.add_zone(storage, "UTC", "UTC")
        return await state.convert_for_saved_zones(storage, "2026-08-17T12:00:00")

    result = asyncio.run(scenario())
    assert result["baseTimezone"] == "Europe/Madrid"
    assert result["conversions"][0]["localTime"] == "2026-08-17 10:00"


def test_create_meeting_returns_false_when_google_isnt_configured(monkeypatch) -> None:
    async def fake_create_event(*args, **kwargs):
        return None

    monkeypatch.setattr(state, "create_event", fake_create_event)

    assert asyncio.run(state.create_meeting("Standup", "2026-08-17T12:00:00")) is False


def test_create_meeting_returns_true_and_uses_default_30_minute_duration(monkeypatch) -> None:
    seen = {}

    async def fake_create_event(summary, start_iso, end_iso, timezone, **kwargs):
        seen["summary"] = summary
        seen["start_iso"] = start_iso
        seen["end_iso"] = end_iso
        return {"id": "evt1"}

    monkeypatch.setattr(state, "create_event", fake_create_event)

    result = asyncio.run(state.create_meeting("Standup", "2026-08-17T12:00:00"))

    assert result is True
    assert seen["summary"] == "Standup"
    assert seen["start_iso"] == "2026-08-17T12:00:00"
    assert seen["end_iso"] == "2026-08-17T12:30:00"
