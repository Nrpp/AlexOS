import asyncio
import importlib.util
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_reading_list_state"
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


def test_create_book_defaults_to_want_status() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.create_book(storage, "Dune", "Frank Herbert")

    book = asyncio.run(scenario())
    assert book["status"] == "want"
    assert book["title"] == "Dune"


def test_update_status() -> None:
    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_book(storage, "Dune", "Frank Herbert")
        return await state.update_status(storage, created["id"], "reading")

    book = asyncio.run(scenario())
    assert book is not None
    assert book["status"] == "reading"


def test_delete_book() -> None:
    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_book(storage, "Dune", "Frank Herbert")
        deleted = await state.delete_book(storage, created["id"])
        remaining = await state.list_books(storage)
        return deleted, remaining

    deleted, remaining = asyncio.run(scenario())
    assert deleted is True
    assert remaining == []
