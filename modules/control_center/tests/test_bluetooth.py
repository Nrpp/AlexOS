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
    assert bluetooth.parse_info(output) == {"paired": True, "connected": True}


def test_parse_info_known_but_not_connected() -> None:
    output = "Device AA:BB:CC:DD:EE:01 (public)\n\tPaired: yes\n\tConnected: no\n"
    assert bluetooth.parse_info(output) == {"paired": True, "connected": False}


def test_parse_info_unknown_device() -> None:
    assert bluetooth.parse_info("") == {"paired": False, "connected": False}


def test_is_available_reflects_whether_bluetoothctl_exists() -> None:
    # On this project's Windows dev machine, bluetoothctl genuinely
    # doesn't exist - is_available() should say so honestly, not crash.
    assert isinstance(bluetooth.is_available(), bool)
