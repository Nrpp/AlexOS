import asyncio
import importlib.util
import sys
from datetime import date
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_water_tracker_state"
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


class FixedDate(date):
    @classmethod
    def today(cls):
        return date(2026, 7, 24)


def test_log_glass_increments_count(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(state, "date", FixedDate)

    async def scenario():
        storage = FakeStorageManager()
        await state.log_glass(storage)
        await state.log_glass(storage)
        return await state.log_glass(storage)

    result = asyncio.run(scenario())
    assert result["count"] == 3
    assert result["date"] == "2026-07-24"


def test_get_today_resets_when_stored_date_is_stale(monkeypatch: pytest.MonkeyPatch) -> None:
    async def scenario():
        storage = FakeStorageManager()
        monkeypatch.setattr(state, "date", FixedDate)
        await state.log_glass(storage)
        await state.log_glass(storage)

        class NextDay(date):
            @classmethod
            def today(cls):
                return date(2026, 7, 25)

        monkeypatch.setattr(state, "date", NextDay)
        return await state.get_today(storage)

    result = asyncio.run(scenario())
    assert result["count"] == 0
    assert result["date"] == "2026-07-25"


def test_reset_today_zeroes_count(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(state, "date", FixedDate)

    async def scenario():
        storage = FakeStorageManager()
        await state.log_glass(storage)
        return await state.reset_today(storage)

    result = asyncio.run(scenario())
    assert result["count"] == 0
