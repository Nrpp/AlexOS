"""bluetooth_presence.py has no relative imports (pure stdlib), so -
unlike state.py/router.py - it can be loaded as a standalone file, the
same pattern modules/control_center/tests/test_bluetooth.py uses for
its sibling bluetooth.py."""

import asyncio
import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_presence_bluetooth_presence"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "bluetooth_presence.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


bluetooth_presence = _load_module()


def _run(coro):
    return asyncio.run(coro)


# --- normalize_address ------------------------------------------------------


def test_normalize_address_upper_cases_a_valid_mac() -> None:
    assert bluetooth_presence.normalize_address("aa:bb:cc:dd:ee:ff") == "AA:BB:CC:DD:EE:FF"


def test_normalize_address_accepts_already_upper_case() -> None:
    assert bluetooth_presence.normalize_address("AA:BB:CC:DD:EE:FF") == "AA:BB:CC:DD:EE:FF"


def test_normalize_address_strips_surrounding_whitespace() -> None:
    assert bluetooth_presence.normalize_address("  AA:BB:CC:DD:EE:FF  ") == "AA:BB:CC:DD:EE:FF"


def test_normalize_address_rejects_empty_and_none() -> None:
    assert bluetooth_presence.normalize_address("") is None
    assert bluetooth_presence.normalize_address(None) is None


def test_normalize_address_rejects_malformed_input() -> None:
    assert bluetooth_presence.normalize_address("not-a-mac-address") is None
    assert bluetooth_presence.normalize_address("AA:BB:CC:DD:EE") is None
    assert bluetooth_presence.normalize_address("AA:BB:CC:DD:EE:GG") is None


# --- is_available -------------------------------------------------------------


def test_is_available_reflects_whether_l2ping_exists() -> None:
    # On this project's dev machines, l2ping genuinely doesn't exist -
    # is_available() should say so honestly, not crash.
    assert isinstance(bluetooth_presence.is_available(), bool)


# --- ping ----------------------------------------------------------------------


def test_ping_returns_false_when_l2ping_is_unavailable(monkeypatch) -> None:
    monkeypatch.setattr(bluetooth_presence, "is_available", lambda: False)
    assert _run(bluetooth_presence.ping("AA:BB:CC:DD:EE:FF")) is False


def test_ping_returns_true_when_l2ping_succeeds(monkeypatch) -> None:
    class FakeProcess:
        async def wait(self):
            return 0

    async def fake_create_subprocess_exec(*args, **kwargs):
        return FakeProcess()

    monkeypatch.setattr(bluetooth_presence, "is_available", lambda: True)
    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)
    assert _run(bluetooth_presence.ping("AA:BB:CC:DD:EE:FF")) is True


def test_ping_returns_false_when_l2ping_reports_unreachable(monkeypatch) -> None:
    class FakeProcess:
        async def wait(self):
            return 1

    async def fake_create_subprocess_exec(*args, **kwargs):
        return FakeProcess()

    monkeypatch.setattr(bluetooth_presence, "is_available", lambda: True)
    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)
    assert _run(bluetooth_presence.ping("AA:BB:CC:DD:EE:FF")) is False


def test_ping_returns_false_on_timeout(monkeypatch) -> None:
    class FakeProcess:
        async def wait(self):
            await asyncio.sleep(10)
            return 0

    async def fake_create_subprocess_exec(*args, **kwargs):
        return FakeProcess()

    monkeypatch.setattr(bluetooth_presence, "is_available", lambda: True)
    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)
    assert _run(bluetooth_presence.ping("AA:BB:CC:DD:EE:FF", timeout_seconds=0.05)) is False
