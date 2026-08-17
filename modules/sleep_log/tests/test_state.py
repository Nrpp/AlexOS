import asyncio
import importlib.util
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_sleep_log_state"
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


def test_log_and_list_entries_sorted_newest_first() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.log_entry(storage, "2026-08-14", 6.5)
        await state.log_entry(storage, "2026-08-16", 8.0)
        await state.log_entry(storage, "2026-08-15", 7.0)
        return await state.list_entries(storage)

    entries = asyncio.run(scenario())
    assert [e["date"] for e in entries] == ["2026-08-16", "2026-08-15", "2026-08-14"]


def test_logging_the_same_date_twice_overwrites_not_duplicates() -> None:
    async def scenario():
        storage = FakeStorageManager()
        first = await state.log_entry(storage, "2026-08-14", 5.0)
        second = await state.log_entry(storage, "2026-08-14", 8.0, note="slept in")
        entries = await state.list_entries(storage)
        return first, second, entries

    first, second, entries = asyncio.run(scenario())
    assert first["id"] == second["id"]
    assert len(entries) == 1
    assert entries[0]["hours"] == 8.0
    assert entries[0]["note"] == "slept in"


def test_delete_entry() -> None:
    async def scenario():
        storage = FakeStorageManager()
        entry = await state.log_entry(storage, "2026-08-14", 6.0)
        deleted = await state.delete_entry(storage, entry["id"])
        remaining = await state.list_entries(storage)
        return deleted, remaining

    deleted, remaining = asyncio.run(scenario())
    assert deleted is True
    assert remaining == []


def test_delete_unknown_entry_returns_false() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.delete_entry(storage, "does-not-exist")

    assert asyncio.run(scenario()) is False
