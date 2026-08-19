"""state.py (and its sibling imports, config_store.py/security.py) need
apps/api on sys.path for `app.core.storage_manager` - and state.py
imports its siblings with real relative imports (`from .config_store
import stale_after_hours`), so it can't be loaded as a bare standalone
file the way modules/notes/tests/test_state.py loads its dependency-
free state.py. Instead this mirrors ModuleManager._import_backend_package
(apps/api/app/core/module_manager.py): import backend/__init__.py as a
package with submodule_search_locations set to the backend/ folder, the
same mechanism the real Module Manager uses, so every sibling relative
import resolves exactly as it does at runtime."""

import importlib.util
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

_REPO_ROOT = Path(__file__).parents[3]
_BACKEND_DIR = Path(__file__).parent.parent / "backend"
_PACKAGE_NAME = "alexos_test_presence_backend"


def _load_backend():
    api_root = str(_REPO_ROOT / "apps" / "api")
    if api_root not in sys.path:
        sys.path.insert(0, api_root)
    if _PACKAGE_NAME in sys.modules:
        return sys.modules[_PACKAGE_NAME]
    spec = importlib.util.spec_from_file_location(
        _PACKAGE_NAME, _BACKEND_DIR / "__init__.py", submodule_search_locations=[str(_BACKEND_DIR)]
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[_PACKAGE_NAME] = module
    spec.loader.exec_module(module)
    return module


_backend = _load_backend()
state = sys.modules[f"{_PACKAGE_NAME}.state"]
config_store = sys.modules[f"{_PACKAGE_NAME}.config_store"]


class FakeStorageManager:
    """In-memory stand-in for the real StorageManager (which needs a
    real SQLite database) - just enough of get/set_module_data to
    exercise state.py's logic. Same pattern as modules/notes' test."""

    def __init__(self) -> None:
        self._data: dict[tuple[str, str], str] = {}

    async def get_module_data(self, module: str, key: str) -> str | None:
        return self._data.get((module, key))

    async def set_module_data(self, module: str, key: str, value: str) -> None:
        self._data[(module, key)] = value


def _run(coro):
    import asyncio

    return asyncio.run(coro)


def setup_function() -> None:
    # config_store is a module-level singleton (see its own docstring) -
    # reset it before every test so one test's config never leaks into
    # the next.
    config_store._config = {
        "unlockTtlMinutes": config_store.DEFAULT_UNLOCK_TTL_MINUTES,
        "staleAfterHours": config_store.DEFAULT_STALE_AFTER_HOURS,
    }


# --- Devices -----------------------------------------------------------------


def test_create_and_list_devices() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.create_device(storage, "Lucas's iPhone")
        await state.create_device(storage, "Pixel 8")
        return await state.list_devices(storage)

    devices = _run(scenario())
    assert {device["name"] for device in devices} == {"Lucas's iPhone", "Pixel 8"}
    # A token is generated per device, and it's never blank.
    assert all(device["token"] for device in devices)


def test_created_device_starts_with_no_event() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.create_device(storage, "Phone")

    device = _run(scenario())
    assert device["event"] is None
    assert device["lastSeen"] is None


def test_rename_device() -> None:
    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_device(storage, "Old name")
        renamed = await state.rename_device(storage, created["id"], "New name")
        return renamed

    renamed = _run(scenario())
    assert renamed is not None
    assert renamed["name"] == "New name"


def test_rename_nonexistent_device_returns_none() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.rename_device(storage, "does-not-exist", "x")

    assert _run(scenario()) is None


def test_delete_device() -> None:
    async def scenario():
        storage = FakeStorageManager()
        created = await state.create_device(storage, "Temp")
        deleted = await state.delete_device(storage, created["id"])
        remaining = await state.list_devices(storage)
        return deleted, remaining

    deleted, remaining = _run(scenario())
    assert deleted is True
    assert remaining == []


def test_deleting_the_primary_device_clears_primary() -> None:
    async def scenario():
        storage = FakeStorageManager()
        device = await state.create_device(storage, "Phone")
        await state.set_primary_device_id(storage, device["id"])
        await state.delete_device(storage, device["id"])
        return await state.get_primary_device_id(storage)

    assert _run(scenario()) is None


def test_record_event_updates_event_and_last_seen() -> None:
    async def scenario():
        storage = FakeStorageManager()
        device = await state.create_device(storage, "Phone")
        return await state.record_event(storage, device["id"], "arrive")

    updated = _run(scenario())
    assert updated is not None
    assert updated["event"] == "arrive"
    assert updated["lastSeen"] is not None


def test_record_event_for_unknown_device_returns_none() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.record_event(storage, "does-not-exist", "arrive")

    assert _run(scenario()) is None


def test_touch_device_updates_last_seen_without_changing_event() -> None:
    async def scenario():
        storage = FakeStorageManager()
        device = await state.create_device(storage, "Phone")
        await state.record_event(storage, device["id"], "arrive")
        return await state.touch_device(storage, device["id"])

    updated = _run(scenario())
    assert updated is not None
    assert updated["event"] == "arrive"
    assert updated["lastSeen"] is not None


def test_touch_device_for_unknown_device_returns_none() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.touch_device(storage, "does-not-exist")

    assert _run(scenario()) is None


# --- Primary device switching --------------------------------------------


def test_primary_device_switch_changes_which_devices_event_drives_home() -> None:
    async def scenario():
        storage = FakeStorageManager()
        phone_a = await state.create_device(storage, "Phone A")
        phone_b = await state.create_device(storage, "Phone B")
        await state.record_event(storage, phone_a["id"], "arrive")
        await state.record_event(storage, phone_b["id"], "leave")

        await state.set_primary_device_id(storage, phone_a["id"])
        status_a_primary = await state.compute_status(storage)

        await state.set_primary_device_id(storage, phone_b["id"])
        status_b_primary = await state.compute_status(storage)

        return status_a_primary, status_b_primary

    status_a_primary, status_b_primary = _run(scenario())
    assert status_a_primary["home"] is True
    assert status_b_primary["home"] is False


# --- PIN ---------------------------------------------------------------------


def test_pin_not_configured_by_default() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.is_pin_configured(storage)

    assert _run(scenario()) is False


def test_set_and_verify_pin() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.set_pin(storage, "1234")
        configured = await state.is_pin_configured(storage)
        correct = await state.verify_stored_pin(storage, "1234")
        wrong = await state.verify_stored_pin(storage, "0000")
        return configured, correct, wrong

    configured, correct, wrong = _run(scenario())
    assert configured is True
    assert correct is True
    assert wrong is False


def test_verify_pin_against_unconfigured_pin_is_false_not_an_error() -> None:
    async def scenario():
        storage = FakeStorageManager()
        return await state.verify_stored_pin(storage, "1234")

    assert _run(scenario()) is False


# --- Unlock session ------------------------------------------------------


def test_unlock_then_is_unlocked_true_within_ttl() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.unlock(storage, ttl_minutes=15)
        return await state.is_unlocked(storage)

    assert _run(scenario()) is True


def test_is_unlocked_false_once_ttl_has_passed() -> None:
    async def scenario():
        storage = FakeStorageManager()
        # Write an already-expired unlock timestamp directly, rather
        # than sleeping in a test.
        expired = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        await storage.set_module_data(state.MODULE_NAME, "unlocked_until", expired)
        return await state.is_unlocked(storage)

    assert _run(scenario()) is False


def test_lock_clears_an_active_unlock_session() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.unlock(storage, ttl_minutes=15)
        await state.lock(storage)
        return await state.is_unlocked(storage)

    assert _run(scenario()) is False


# --- compute_status: fail-safe defaults and staleness ---------------------


def test_status_defaults_to_not_home_and_unlocked_with_no_devices_and_no_pin() -> None:
    """Not locked with no PIN yet, even though not home - locking with no
    PIN configured would seal off Settings (the only place a PIN can be
    set) with no way back in. See test_locked_requires_a_pin_to_engage
    below for the dedicated regression test."""

    async def scenario():
        storage = FakeStorageManager()
        return await state.compute_status(storage)

    status = _run(scenario())
    assert status["home"] is False
    assert status["locked"] is False
    assert status["pinConfigured"] is False
    assert status["primaryDeviceId"] is None
    assert status["devices"] == []


def test_status_locked_once_a_pin_exists_and_still_no_device_has_reported() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.set_pin(storage, "1234")
        return await state.compute_status(storage)

    status = _run(scenario())
    assert status["home"] is False
    assert status["locked"] is True


def test_status_not_home_when_primary_never_reported() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.set_pin(storage, "1234")
        device = await state.create_device(storage, "Phone")
        await state.set_primary_device_id(storage, device["id"])
        return await state.compute_status(storage)

    status = _run(scenario())
    assert status["home"] is False
    assert status["locked"] is True


def test_status_home_when_primary_last_event_is_arrive() -> None:
    async def scenario():
        storage = FakeStorageManager()
        device = await state.create_device(storage, "Phone")
        await state.set_primary_device_id(storage, device["id"])
        await state.record_event(storage, device["id"], "arrive")
        return await state.compute_status(storage)

    status = _run(scenario())
    assert status["home"] is True
    assert status["locked"] is False


def test_status_away_when_primary_last_event_is_leave() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.set_pin(storage, "1234")
        device = await state.create_device(storage, "Phone")
        await state.set_primary_device_id(storage, device["id"])
        await state.record_event(storage, device["id"], "arrive")
        await state.record_event(storage, device["id"], "leave")
        return await state.compute_status(storage)

    status = _run(scenario())
    assert status["home"] is False
    assert status["locked"] is True


def test_locked_requires_a_pin_to_engage() -> None:
    """Regression test for the first-run lockout: with no PIN ever set,
    `locked` must stay False no matter how "away" the primary device
    reports - otherwise the owner is sealed out of Settings (the only
    place a PIN can be set) with no way back in short of a raw API call."""

    async def scenario():
        storage = FakeStorageManager()
        device = await state.create_device(storage, "Phone")
        await state.set_primary_device_id(storage, device["id"])
        await state.record_event(storage, device["id"], "leave")
        return await state.compute_status(storage)

    status = _run(scenario())
    assert status["home"] is False
    assert status["pinConfigured"] is False
    assert status["locked"] is False


def test_locked_is_false_while_an_unlock_session_is_active_and_away() -> None:
    async def scenario():
        storage = FakeStorageManager()
        await state.set_pin(storage, "1234")
        await state.unlock(storage, ttl_minutes=15)
        return await state.compute_status(storage)

    status = _run(scenario())
    assert status["home"] is False
    assert status["locked"] is False


def test_stale_primary_signal_is_treated_as_not_home() -> None:
    """The safety fallback: an "arrive" that's far older than
    staleAfterHours (phone died, automation got disabled, ...) must not
    keep the dashboard unlocked forever."""

    async def scenario():
        storage = FakeStorageManager()
        await state.set_pin(storage, "1234")
        config_store.configure({"staleAfterHours": 1})
        device = await state.create_device(storage, "Phone")
        await state.set_primary_device_id(storage, device["id"])
        await state.record_event(storage, device["id"], "arrive")

        # Overwrite lastSeen with a timestamp far outside the 1-hour window.
        devices = await state.list_devices(storage)
        devices[0]["lastSeen"] = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
        await storage.set_module_data(state.MODULE_NAME, "devices", json.dumps(devices))

        return await state.compute_status(storage)

    status = _run(scenario())
    assert status["home"] is False
    assert status["locked"] is True


def test_stale_after_hours_zero_disables_the_staleness_check() -> None:
    async def scenario():
        storage = FakeStorageManager()
        config_store.configure({"staleAfterHours": 0})
        device = await state.create_device(storage, "Phone")
        await state.set_primary_device_id(storage, device["id"])
        await state.record_event(storage, device["id"], "arrive")

        devices = await state.list_devices(storage)
        devices[0]["lastSeen"] = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
        await storage.set_module_data(state.MODULE_NAME, "devices", json.dumps(devices))

        return await state.compute_status(storage)

    status = _run(scenario())
    assert status["home"] is True
