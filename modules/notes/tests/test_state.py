import asyncio
import importlib.util
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_notes_state"
_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_state():
    # state.py imports `app.core.storage_manager` - only importable
    # once apps/api is on sys.path, which isn't the case when pytest
    # runs from the repo root (testpaths = ["modules"], see pyproject.toml).
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
    """In-memory stand-in for the real StorageManager (which needs a
    real SQLite database) - just enough of get/set_module_data to
    exercise state.py's logic."""

    def __init__(self) -> None:
        self._data: dict[tuple[str, str], str] = {}

    async def get_module_data(self, module: str, key: str) -> str | None:
        return self._data.get((module, key))

    async def set_module_data(self, module: str, key: str, value: str) -> None:
        self._data[(module, key)] = value


def test_create_and_list_notes() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.create_note(storage, "Groceries", "Milk, eggs")
        await state.create_note(storage, "Ideas", "Build a robot")
        return await state.list_notes(storage)

    notes = asyncio.run(scenario())
    assert {note["title"] for note in notes} == {"Groceries", "Ideas"}


def test_update_note() -> None:
    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_note(storage, "Draft", "v1")
        updated = await state.update_note(storage, created["id"], "Final", "v2")
        return created, updated

    created, updated = asyncio.run(scenario())
    assert updated is not None
    assert updated["title"] == "Final"
    assert updated["body"] == "v2"
    assert updated["id"] == created["id"]


def test_update_nonexistent_note_returns_none() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.update_note(storage, "does-not-exist", "x", "y")

    assert asyncio.run(scenario()) is None


def test_delete_note() -> None:
    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_note(storage, "Temporary", "")
        deleted = await state.delete_note(storage, created["id"])
        remaining = await state.list_notes(storage)
        return deleted, remaining

    deleted, remaining = asyncio.run(scenario())
    assert deleted is True
    assert remaining == []


def test_delete_nonexistent_note_returns_false() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.delete_note(storage, "does-not-exist")

    assert asyncio.run(scenario()) is False


def test_list_notes_sorted_most_recently_updated_first() -> None:
    async def scenario():
        storage = FakeStorageManager()
        first = await state.create_note(storage, "First", "")
        await asyncio.sleep(0.01)
        await state.create_note(storage, "Second", "")
        # Touch "First" again so it should now sort ahead of "Second".
        await state.update_note(storage, first["id"], "First", "edited")
        return await state.list_notes(storage)

    notes = asyncio.run(scenario())
    assert notes[0]["title"] == "First"
