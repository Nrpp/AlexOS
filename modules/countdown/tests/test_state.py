import asyncio
import importlib.util
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_countdown_state"
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


def test_create_and_list_sorted_by_target_date() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.create_countdown(storage, "Trip", "2026-12-01T00:00:00")
        await state.create_countdown(storage, "Exam", "2026-09-01T00:00:00")
        return await state.list_countdowns(storage)

    countdowns = asyncio.run(scenario())
    assert [c["title"] for c in countdowns] == ["Exam", "Trip"]


def test_delete_countdown() -> None:
    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_countdown(storage, "Trip", "2026-12-01T00:00:00")
        deleted = await state.delete_countdown(storage, created["id"])
        remaining = await state.list_countdowns(storage)
        return deleted, remaining

    deleted, remaining = asyncio.run(scenario())
    assert deleted is True
    assert remaining == []


def test_delete_unknown_countdown_returns_false() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.delete_countdown(storage, "does-not-exist")

    assert asyncio.run(scenario()) is False
