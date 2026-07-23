import asyncio
import importlib.util
import sys
from pathlib import Path

import pytest

_MODULE_NAME = "alexos_test_network_state"
_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_state():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _STATE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_state()


def test_get_internal_ip_returns_a_dotted_ip() -> None:
    ip = state.get_internal_ip()
    assert ip is None or ip.count(".") == 3


def test_read_arp_table_returns_empty_list_when_file_missing(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setattr(state, "_ARP_TABLE_PATH", tmp_path / "does-not-exist")
    assert state.read_arp_table() == []


def test_read_arp_table_skips_incomplete_entries(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    arp_file = tmp_path / "arp"
    arp_file.write_text(
        "IP address       HW type     Flags       HW address            Mask     Device\n"
        "192.168.1.1      0x1         0x2         aa:bb:cc:dd:ee:ff     *        eth0\n"
        "192.168.1.50     0x1         0x0         00:00:00:00:00:00     *        eth0\n"
        "192.168.1.77     0x1         0x2         11:22:33:44:55:66     *        eth0\n"
    )
    monkeypatch.setattr(state, "_ARP_TABLE_PATH", arp_file)
    devices = state.read_arp_table()
    assert [device.ip for device in devices] == ["192.168.1.1", "192.168.1.77"]
    assert devices[0].mac == "aa:bb:cc:dd:ee:ff"


def test_scan_subnet_returns_false_when_no_subnet_available(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(state, "get_internal_ip", lambda: None)
    assert asyncio.run(state.scan_subnet(cidr_override=None)) is False


def test_speed_test_to_payload() -> None:
    result = state.SpeedTestResult(download_mbps=100.5, upload_mbps=20.1, ping_ms=15.0)
    assert state.speed_test_to_payload(result) == {"downloadMbps": 100.5, "uploadMbps": 20.1, "pingMs": 15.0}


def test_device_to_payload() -> None:
    device = state.Device(ip="192.168.1.1", mac="aa:bb:cc:dd:ee:ff", hostname="router.local")
    assert state.device_to_payload(device) == {"ip": "192.168.1.1", "mac": "aa:bb:cc:dd:ee:ff", "hostname": "router.local"}


def test_status_to_payload_with_no_speed_test_yet() -> None:
    status = state.NetworkStatus(
        internal_ip="192.168.1.42", public_ip=None, latency_ms=None, devices_online=0, last_speed_test=None
    )
    payload = state.status_to_payload(status)
    assert payload["lastSpeedTest"] is None
    assert payload["internalIp"] == "192.168.1.42"
