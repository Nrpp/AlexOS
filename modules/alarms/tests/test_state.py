import asyncio
import importlib.util
import sys
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_alarms_state"
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


def test_create_alarm_defaults_to_enabled() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.create_alarm(storage, "Wake up", "07:00")

    alarm = asyncio.run(scenario())
    assert alarm["enabled"] is True
    assert alarm["time"] == "07:00"


def test_create_alarm_rejects_invalid_time() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.create_alarm(storage, "Bad", "25:00")

    with pytest.raises(state.InvalidTimeError):
        asyncio.run(scenario())


def test_list_alarms_sorted_by_time() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.create_alarm(storage, "Evening", "20:00")
        await state.create_alarm(storage, "Morning", "07:00")
        return await state.list_alarms(storage)

    alarms = asyncio.run(scenario())
    assert [a["label"] for a in alarms] == ["Morning", "Evening"]


def test_set_enabled_toggles_alarm() -> None:
    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_alarm(storage, "Wake up", "07:00")
        return await state.set_enabled(storage, created["id"], False)

    alarm = asyncio.run(scenario())
    assert alarm["enabled"] is False


def test_set_enabled_on_unknown_alarm_returns_none() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.set_enabled(storage, "does-not-exist", False)

    assert asyncio.run(scenario()) is None


def test_due_alarms_matches_enabled_alarm_at_current_time() -> None:
    alarms = [{"id": "1", "label": "Wake up", "time": "07:00", "enabled": True}]
    due = state.due_alarms(alarms, "07:00", "2026-08-17", {})
    assert [a["id"] for a in due] == ["1"]


def test_due_alarms_skips_disabled_alarms() -> None:
    alarms = [{"id": "1", "label": "Wake up", "time": "07:00", "enabled": False}]
    assert state.due_alarms(alarms, "07:00", "2026-08-17", {}) == []


def test_due_alarms_skips_alarms_at_a_different_time() -> None:
    alarms = [{"id": "1", "label": "Wake up", "time": "07:00", "enabled": True}]
    assert state.due_alarms(alarms, "08:00", "2026-08-17", {}) == []


def test_due_alarms_skips_alarms_already_fired_today() -> None:
    alarms = [{"id": "1", "label": "Wake up", "time": "07:00", "enabled": True}]
    fired_today = {"1": "2026-08-17"}
    assert state.due_alarms(alarms, "07:00", "2026-08-17", fired_today) == []


def test_due_alarms_fires_again_on_a_new_day() -> None:
    alarms = [{"id": "1", "label": "Wake up", "time": "07:00", "enabled": True}]
    fired_today = {"1": "2026-08-16"}  # fired yesterday, not today
    due = state.due_alarms(alarms, "07:00", "2026-08-17", fired_today)
    assert [a["id"] for a in due] == ["1"]


def test_delete_alarm() -> None:
    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_alarm(storage, "Wake up", "07:00")
        deleted = await state.delete_alarm(storage, created["id"])
        remaining = await state.list_alarms(storage)
        return deleted, remaining

    deleted, remaining = asyncio.run(scenario())
    assert deleted is True
    assert remaining == []
