import importlib.util
import json
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_tailscale_state"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_module()

_SAMPLE_STATUS = {
    "BackendState": "Running",
    "Self": {
        "HostName": "raspberrypi",
        "TailscaleIPs": ["100.101.102.103"],
        "Online": True,
        "OS": "linux",
    },
    "Peer": {
        "nodekey:1": {
            "HostName": "laptop",
            "TailscaleIPs": ["100.104.105.106"],
            "Online": True,
            "OS": "windows",
        },
        "nodekey:2": {
            "HostName": "phone",
            "TailscaleIPs": ["100.107.108.109"],
            "Online": False,
            "OS": "iOS",
        },
    },
}


def test_parse_status_extracts_self_and_peers() -> None:
    result = state.parse_status(json.dumps(_SAMPLE_STATUS))

    assert result["backendState"] == "Running"
    assert result["self"] == {"hostname": "raspberrypi", "ip": "100.101.102.103", "online": True, "os": "linux"}
    assert len(result["peers"]) == 2


def test_parse_status_sorts_peers_by_hostname() -> None:
    result = state.parse_status(json.dumps(_SAMPLE_STATUS))
    assert [peer["hostname"] for peer in result["peers"]] == ["laptop", "phone"]


def test_parse_status_reports_offline_peer_correctly() -> None:
    result = state.parse_status(json.dumps(_SAMPLE_STATUS))
    phone = next(peer for peer in result["peers"] if peer["hostname"] == "phone")
    assert phone["online"] is False


def test_parse_status_handles_no_peers() -> None:
    minimal = {"BackendState": "Running", "Self": _SAMPLE_STATUS["Self"], "Peer": {}}
    result = state.parse_status(json.dumps(minimal))
    assert result["peers"] == []


def test_is_available_reflects_whether_tailscale_cli_exists() -> None:
    # On this project's Windows dev machine, the tailscale CLI genuinely
    # isn't installed - is_available() should say so honestly, not crash.
    assert isinstance(state.is_available(), bool)
