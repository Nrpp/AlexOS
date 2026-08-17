import asyncio
import importlib.util
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_package_tracker_state"
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


def test_resolve_tracking_url_prefers_the_given_url() -> None:
    url = state.resolve_tracking_url("DHL", "123", "https://dhl.com/track/123")
    assert url == "https://dhl.com/track/123"


def test_resolve_tracking_url_falls_back_to_a_search_link() -> None:
    url = state.resolve_tracking_url("DHL", "123", "")
    assert url.startswith("https://www.google.com/search?q=")
    assert "DHL" in url
    assert "123" in url


def test_create_package_without_a_delivery_date_never_touches_the_calendar(monkeypatch) -> None:
    async def fake_create_event(*args, **kwargs):
        raise AssertionError("should not be called without an estimated delivery date")

    monkeypatch.setattr(state, "create_event", fake_create_event)

    async def scenario():
        storage = FakeStorageManager()
        return await state.create_package(storage, "Headphones", "DHL", "123", "", None)

    package = asyncio.run(scenario())
    assert package["calendarEventCreated"] is False


def test_create_package_with_a_delivery_date_creates_a_calendar_event(monkeypatch) -> None:
    seen = {}

    async def fake_create_event(summary, start_iso, end_iso, timezone, *, calendar_id="primary", description=""):
        seen["summary"] = summary
        seen["start_iso"] = start_iso
        seen["end_iso"] = end_iso
        return {"id": "evt1"}

    monkeypatch.setattr(state, "create_event", fake_create_event)

    async def scenario():
        storage = FakeStorageManager()
        return await state.create_package(storage, "Headphones", "DHL", "123", "", "2026-09-05")

    package = asyncio.run(scenario())
    assert package["calendarEventCreated"] is True
    assert seen["summary"] == "Package: Headphones"
    assert seen["start_iso"] == "2026-09-05T09:00:00"
    assert seen["end_iso"] == "2026-09-05T10:00:00"


def test_list_packages_sorted_by_delivery_date_undated_last(monkeypatch) -> None:
    async def fake_create_event(*args, **kwargs):
        return None

    monkeypatch.setattr(state, "create_event", fake_create_event)

    async def scenario():
        storage = FakeStorageManager()
        await state.create_package(storage, "No date", "", "", "", None)
        await state.create_package(storage, "Later", "", "", "", "2026-09-10")
        await state.create_package(storage, "Sooner", "", "", "", "2026-09-01")
        return await state.list_packages(storage)

    packages = asyncio.run(scenario())
    assert [p["label"] for p in packages] == ["Sooner", "Later", "No date"]


def test_delete_package(monkeypatch) -> None:
    async def fake_create_event(*args, **kwargs):
        return None

    monkeypatch.setattr(state, "create_event", fake_create_event)

    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_package(storage, "Headphones", "", "", "", None)
        deleted = await state.delete_package(storage, created["id"])
        remaining = await state.list_packages(storage)
        return deleted, remaining

    deleted, remaining = asyncio.run(scenario())
    assert deleted is True
    assert remaining == []
