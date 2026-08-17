import asyncio
import importlib.util
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_daily_agenda_state"
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


def test_entries_are_scoped_to_their_date() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.create_entry(storage, "2026-08-17", "09:00", "Standup")
        await state.create_entry(storage, "2026-08-18", "10:00", "Tomorrow's thing")
        return await state.list_entries_for_date(storage, "2026-08-17")

    entries = asyncio.run(scenario())
    assert [e["text"] for e in entries] == ["Standup"]


def test_entries_for_a_date_are_sorted_by_time() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.create_entry(storage, "2026-08-17", "15:00", "Afternoon")
        await state.create_entry(storage, "2026-08-17", "09:00", "Morning")
        return await state.list_entries_for_date(storage, "2026-08-17")

    entries = asyncio.run(scenario())
    assert [e["text"] for e in entries] == ["Morning", "Afternoon"]


def test_delete_entry() -> None:
    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_entry(storage, "2026-08-17", "09:00", "Standup")
        deleted = await state.delete_entry(storage, created["id"])
        remaining = await state.list_entries_for_date(storage, "2026-08-17")
        return deleted, remaining

    deleted, remaining = asyncio.run(scenario())
    assert deleted is True
    assert remaining == []


def test_delete_unknown_entry_returns_false() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.delete_entry(storage, "does-not-exist")

    assert asyncio.run(scenario()) is False
