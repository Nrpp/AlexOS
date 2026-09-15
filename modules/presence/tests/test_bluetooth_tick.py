"""Tests the Bluetooth-presence tick loop's per-tick logic
(`_bluetooth_tick_once` in backend/__init__.py) - hysteresis on the
"leave" side, immediate "arrive", and that presence.updated is only
published when a device's event actually changes. Loads the backend
package the same way ModuleManager._import_backend_package does (see
test_state.py's docstring) so router.py/state.py/bluetooth_presence.py's
real relative imports resolve."""

import asyncio
import importlib.util
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).parents[3]
_BACKEND_DIR = Path(__file__).parent.parent / "backend"
_PACKAGE_NAME = "alexos_test_presence_backend_tick"


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
    def __init__(self) -> None:
        self._data: dict[tuple[str, str], str] = {}

    async def get_module_data(self, module: str, key: str) -> str | None:
        return self._data.get((module, key))

    async def set_module_data(self, module: str, key: str, value: str) -> None:
        self._data[(module, key)] = value


class FakeEventBus:
    def __init__(self) -> None:
        self.published: list[tuple[str, dict]] = []

    async def publish(self, name, payload, *, source=None, retain=False) -> None:
        self.published.append((name, payload))


def _run(coro):
    return asyncio.run(coro)


def setup_function() -> None:
    _backend._miss_counts.clear()
    config_store._config = {
        "unlockTtlMinutes": config_store.DEFAULT_UNLOCK_TTL_MINUTES,
        "staleAfterHours": config_store.DEFAULT_STALE_AFTER_HOURS,
        "bluetoothPollIntervalSeconds": config_store.DEFAULT_BLUETOOTH_POLL_INTERVAL_SECONDS,
        "bluetoothPingTimeoutSeconds": config_store.DEFAULT_BLUETOOTH_PING_TIMEOUT_SECONDS,
        "bluetoothMissesBeforeLeave": config_store.DEFAULT_BLUETOOTH_MISSES_BEFORE_LEAVE,
    }


def test_tick_does_nothing_when_l2ping_is_unavailable(monkeypatch) -> None:
    monkeypatch.setattr(_backend, "bluetooth_is_available", lambda: False)

    async def scenario():
        storage = FakeStorageManager()
        device = await state.create_device(storage, "Phone")
        await state.set_device_bluetooth_address(storage, device["id"], "AA:BB:CC:DD:EE:FF")
        bus = FakeEventBus()
        await _backend._bluetooth_tick_once(bus, storage)
        return bus, await state.get_device(storage, device["id"])

    bus, device = _run(scenario())
    assert device["event"] is None
    assert bus.published == []


def test_tick_ignores_devices_without_a_bluetooth_address(monkeypatch) -> None:
    monkeypatch.setattr(_backend, "bluetooth_is_available", lambda: True)

    async def fake_ping(address, timeout_seconds=5.0):
        raise AssertionError("ping() must not be called for a device with no bluetoothAddress")

    monkeypatch.setattr(_backend, "bluetooth_ping", fake_ping)

    async def scenario():
        storage = FakeStorageManager()
        await state.create_device(storage, "Phone")
        await _backend._bluetooth_tick_once(FakeEventBus(), storage)

    _run(scenario())  # doesn't raise


def test_tick_marks_arrive_immediately_on_a_successful_ping(monkeypatch) -> None:
    monkeypatch.setattr(_backend, "bluetooth_is_available", lambda: True)

    async def fake_ping(address, timeout_seconds=5.0):
        return True

    monkeypatch.setattr(_backend, "bluetooth_ping", fake_ping)

    async def scenario():
        storage = FakeStorageManager()
        device = await state.create_device(storage, "Phone")
        await state.set_device_bluetooth_address(storage, device["id"], "AA:BB:CC:DD:EE:FF")
        bus = FakeEventBus()
        await _backend._bluetooth_tick_once(bus, storage)
        return bus, await state.get_device(storage, device["id"])

    bus, device = _run(scenario())
    assert device["event"] == "arrive"
    assert len(bus.published) == 1
    assert bus.published[0][0] == "presence.updated"


def test_tick_does_not_republish_while_already_marked_arrive(monkeypatch) -> None:
    monkeypatch.setattr(_backend, "bluetooth_is_available", lambda: True)

    async def fake_ping(address, timeout_seconds=5.0):
        return True

    monkeypatch.setattr(_backend, "bluetooth_ping", fake_ping)

    async def scenario():
        storage = FakeStorageManager()
        device = await state.create_device(storage, "Phone")
        await state.set_device_bluetooth_address(storage, device["id"], "AA:BB:CC:DD:EE:FF")
        bus = FakeEventBus()
        await _backend._bluetooth_tick_once(bus, storage)  # first tick: None -> arrive
        bus.published.clear()
        await _backend._bluetooth_tick_once(bus, storage)  # second tick: still arrive
        return bus, await state.get_device(storage, device["id"])

    bus, device = _run(scenario())
    assert device["event"] == "arrive"
    assert bus.published == []


def test_tick_requires_consecutive_misses_before_leaving(monkeypatch) -> None:
    """A single dropped ping mustn't bounce the dashboard into away
    mode - real-world Bluetooth ranging is flaky. Only
    bluetoothMissesBeforeLeave *consecutive* failures should flip it."""
    monkeypatch.setattr(_backend, "bluetooth_is_available", lambda: True)
    config_store.configure({"bluetoothMissesBeforeLeave": 3})

    async def fake_ping(address, timeout_seconds=5.0):
        return False

    monkeypatch.setattr(_backend, "bluetooth_ping", fake_ping)

    async def scenario():
        storage = FakeStorageManager()
        device = await state.create_device(storage, "Phone")
        await state.set_device_bluetooth_address(storage, device["id"], "AA:BB:CC:DD:EE:FF")
        await state.record_event(storage, device["id"], "arrive")  # starts "home"
        bus = FakeEventBus()

        await _backend._bluetooth_tick_once(bus, storage)  # miss 1/3
        after_first_miss = await state.get_device(storage, device["id"])
        await _backend._bluetooth_tick_once(bus, storage)  # miss 2/3
        after_second_miss = await state.get_device(storage, device["id"])
        await _backend._bluetooth_tick_once(bus, storage)  # miss 3/3 -> leave
        after_third_miss = await state.get_device(storage, device["id"])
        return bus, after_first_miss, after_second_miss, after_third_miss

    bus, after_first_miss, after_second_miss, after_third_miss = _run(scenario())
    assert after_first_miss["event"] == "arrive"
    assert after_second_miss["event"] == "arrive"
    assert after_third_miss["event"] == "leave"
    assert len(bus.published) == 1  # only the final flip publishes


def test_tick_leave_does_not_touch_last_seen(monkeypatch) -> None:
    """The "leave" here is inferred from silence, not real contact - see
    record_event's touch_last_seen docstring."""
    monkeypatch.setattr(_backend, "bluetooth_is_available", lambda: True)
    config_store.configure({"bluetoothMissesBeforeLeave": 1})

    async def fake_ping(address, timeout_seconds=5.0):
        return False

    monkeypatch.setattr(_backend, "bluetooth_ping", fake_ping)

    async def scenario():
        storage = FakeStorageManager()
        device = await state.create_device(storage, "Phone")
        await state.set_device_bluetooth_address(storage, device["id"], "AA:BB:CC:DD:EE:FF")
        arrived = await state.record_event(storage, device["id"], "arrive")
        await _backend._bluetooth_tick_once(FakeEventBus(), storage)
        left = await state.get_device(storage, device["id"])
        return arrived, left

    arrived, left = _run(scenario())
    assert left["event"] == "leave"
    assert left["lastSeen"] == arrived["lastSeen"]


def test_a_successful_ping_resets_the_miss_counter(monkeypatch) -> None:
    monkeypatch.setattr(_backend, "bluetooth_is_available", lambda: True)
    config_store.configure({"bluetoothMissesBeforeLeave": 2})
    ping_results = iter([False, True, False])

    async def fake_ping(address, timeout_seconds=5.0):
        return next(ping_results)

    monkeypatch.setattr(_backend, "bluetooth_ping", fake_ping)

    async def scenario():
        storage = FakeStorageManager()
        device = await state.create_device(storage, "Phone")
        await state.set_device_bluetooth_address(storage, device["id"], "AA:BB:CC:DD:EE:FF")
        await state.record_event(storage, device["id"], "arrive")

        await _backend._bluetooth_tick_once(FakeEventBus(), storage)  # miss 1/2
        await _backend._bluetooth_tick_once(FakeEventBus(), storage)  # success -> resets
        await _backend._bluetooth_tick_once(FakeEventBus(), storage)  # miss 1/2 again, not 2/2
        return await state.get_device(storage, device["id"])

    device = _run(scenario())
    assert device["event"] == "arrive"
