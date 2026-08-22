import asyncio
import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_control_center_bluetooth"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "bluetooth.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


bluetooth = _load_module()


def _run(coro):
    return asyncio.run(coro)


def test_parse_devices() -> None:
    output = (
        "Device AA:BB:CC:DD:EE:01 Kitchen Speaker\n"
        "Device AA:BB:CC:DD:EE:02 Wireless Headphones\n"
        "Some other line that isn't a device\n"
    )
    devices = bluetooth.parse_devices(output)
    assert devices == {
        "AA:BB:CC:DD:EE:01": "Kitchen Speaker",
        "AA:BB:CC:DD:EE:02": "Wireless Headphones",
    }


def test_parse_devices_empty_output() -> None:
    assert bluetooth.parse_devices("") == {}


def test_parse_info_paired_and_connected() -> None:
    output = "Device AA:BB:CC:DD:EE:01 (public)\n\tPaired: yes\n\tConnected: yes\n\tTrusted: yes\n"
    assert bluetooth.parse_info(output) == {"paired": True, "connected": True, "audioCapable": False}


def test_parse_info_known_but_not_connected() -> None:
    output = "Device AA:BB:CC:DD:EE:01 (public)\n\tPaired: yes\n\tConnected: no\n"
    assert bluetooth.parse_info(output) == {"paired": True, "connected": False, "audioCapable": False}


def test_parse_info_unknown_device() -> None:
    assert bluetooth.parse_info("") == {"paired": False, "connected": False, "audioCapable": False}


def test_parse_info_detects_a2dp_audio_sink_capability() -> None:
    output = (
        "Device AA:BB:CC:DD:EE:01 (public)\n"
        "\tPaired: yes\n"
        "\tConnected: yes\n"
        "\tUUID: Audio Sink               (0000110b-0000-1000-8000-00805f9b34fb)\n"
    )
    assert bluetooth.parse_info(output) == {"paired": True, "connected": True, "audioCapable": True}


def test_parse_info_a2dp_uuid_match_is_case_insensitive() -> None:
    output = "\tUUID: Audio Sink               (0000110B-0000-1000-8000-00805F9B34FB)\n"
    assert bluetooth.parse_info(output)["audioCapable"] is True


def test_parse_info_paired_device_without_audio_sink_is_not_audio_capable() -> None:
    # e.g. a Bluetooth keyboard - paired and connected, but not a speaker source.
    output = (
        "Device AA:BB:CC:DD:EE:02 (public)\n"
        "\tPaired: yes\n"
        "\tConnected: yes\n"
        "\tUUID: Human Interface Device    (00001124-0000-1000-8000-00805f9b34fb)\n"
    )
    assert bluetooth.parse_info(output)["audioCapable"] is False


def test_parse_adapter_state_all_on() -> None:
    output = "Controller AA:BB:CC:DD:EE:FF (public)\n\tPowered: yes\n\tDiscoverable: yes\n\tPairable: yes\n"
    assert bluetooth.parse_adapter_state(output) == {"powered": True, "discoverable": True, "pairable": True}


def test_parse_adapter_state_all_off() -> None:
    output = "Controller AA:BB:CC:DD:EE:FF (public)\n\tPowered: no\n\tDiscoverable: no\n\tPairable: no\n"
    assert bluetooth.parse_adapter_state(output) == {"powered": False, "discoverable": False, "pairable": False}


def test_parse_adapter_state_empty_output() -> None:
    assert bluetooth.parse_adapter_state("") == {"powered": False, "discoverable": False, "pairable": False}


def test_is_available_reflects_whether_bluetoothctl_exists() -> None:
    # On this project's Windows dev machine, bluetoothctl genuinely
    # doesn't exist - is_available() should say so honestly, not crash.
    assert isinstance(bluetooth.is_available(), bool)


# --- set_speaker_mode: judged by resulting adapter state, not by each
# individual command's own return code ---------------------------------

_SHOW_ALL_ON = "Controller AA:BB:CC:DD:EE:FF (public)\n\tPowered: yes\n\tDiscoverable: yes\n\tPairable: yes\n"
_SHOW_ALL_OFF = "Controller AA:BB:CC:DD:EE:FF (public)\n\tPowered: yes\n\tDiscoverable: no\n\tPairable: no\n"
_SHOW_NOT_POWERED = "Controller AA:BB:CC:DD:EE:FF (public)\n\tPowered: no\n\tDiscoverable: no\n\tPairable: no\n"


def test_set_speaker_mode_succeeds_despite_a_busy_error_from_power_on(monkeypatch) -> None:
    """Regression test for a real error confirmed on actual Raspberry
    Pi hardware: `bluetoothctl power on` against an adapter that's
    already (or about to be) powered can return
    `org.bluez.Error.Busy` - a transient/already-there response, not a
    genuine failure. The adapter still ends up powered/discoverable/
    pairable, and set_speaker_mode must report that as success rather
    than surfacing the scary-looking Busy error."""

    async def fake_run(*args, **kwargs):
        if args[:2] == ("bluetoothctl", "power"):
            return 1, "", "Failed to set power on: org.bluez.Error.Busy"
        if args[:2] == ("bluetoothctl", "show"):
            return 0, _SHOW_ALL_ON, ""
        return 0, "", ""

    monkeypatch.setattr(bluetooth, "is_available", lambda: True)
    monkeypatch.setattr(bluetooth, "_run", fake_run)
    ok, message = _run(bluetooth.set_speaker_mode(True))
    assert ok is True
    assert message == ""


def test_set_speaker_mode_enable_reports_failure_when_adapter_never_powers_on(monkeypatch) -> None:
    async def fake_run(*args, **kwargs):
        if args[:2] == ("bluetoothctl", "show"):
            return 0, _SHOW_NOT_POWERED, ""
        return 1, "", "some real error"

    monkeypatch.setattr(bluetooth, "is_available", lambda: True)
    monkeypatch.setattr(bluetooth, "_run", fake_run)
    ok, message = _run(bluetooth.set_speaker_mode(True))
    assert ok is False
    assert message != ""


def test_set_speaker_mode_disable_succeeds_when_discoverable_and_pairable_end_up_off(monkeypatch) -> None:
    async def fake_run(*args, **kwargs):
        if args[:2] == ("bluetoothctl", "show"):
            return 0, _SHOW_ALL_OFF, ""
        return 0, "", ""

    monkeypatch.setattr(bluetooth, "is_available", lambda: True)
    monkeypatch.setattr(bluetooth, "_run", fake_run)
    ok, _message = _run(bluetooth.set_speaker_mode(False))
    assert ok is True


def test_set_speaker_mode_reports_unavailable_bluetoothctl(monkeypatch) -> None:
    monkeypatch.setattr(bluetooth, "is_available", lambda: False)
    ok, message = _run(bluetooth.set_speaker_mode(True))
    assert ok is False
    assert "isn't available" in message
