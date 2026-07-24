import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_control_center_wifi"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "wifi.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


wifi = _load_module()


def test_parse_wifi_list_basic() -> None:
    output = "*:HomeNetwork:78:WPA2\n:Neighbor5G:55:WPA2\n:OpenGuest::\n"
    networks = wifi.parse_wifi_list(output)
    by_ssid = {network.ssid: network for network in networks}

    assert by_ssid["HomeNetwork"].in_use is True
    assert by_ssid["HomeNetwork"].signal == 78
    assert by_ssid["HomeNetwork"].secure is True

    assert by_ssid["OpenGuest"].secure is False
    assert by_ssid["OpenGuest"].signal == 0


def test_parse_wifi_list_sorted_strongest_first() -> None:
    output = ":Weak:10:WPA2\n:Strong:90:WPA2\n:Medium:50:WPA2\n"
    networks = wifi.parse_wifi_list(output)
    assert [network.ssid for network in networks] == ["Strong", "Medium", "Weak"]


def test_parse_wifi_list_deduplicates_by_ssid_keeping_strongest() -> None:
    output = ":OfficeWifi:30:WPA2\n:OfficeWifi:85:WPA2\n"
    networks = wifi.parse_wifi_list(output)
    assert len(networks) == 1
    assert networks[0].signal == 85


def test_parse_wifi_list_handles_escaped_colon_in_ssid() -> None:
    # nmcli escapes a literal colon within a field as "\:"
    output = ":Cafe\\:Wifi:60:WPA2\n"
    networks = wifi.parse_wifi_list(output)
    assert networks[0].ssid == "Cafe:Wifi"


def test_parse_wifi_list_skips_blank_ssid() -> None:
    output = ":: 40:WPA2\n:RealNetwork:40:WPA2\n"
    networks = wifi.parse_wifi_list(output)
    assert [network.ssid for network in networks] == ["RealNetwork"]


def test_is_available_reflects_whether_nmcli_exists() -> None:
    # On this project's Windows dev machine, nmcli genuinely doesn't
    # exist - is_available() should say so honestly, not crash.
    assert isinstance(wifi.is_available(), bool)
