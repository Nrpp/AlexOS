"""WiFi control via `nmcli` (NetworkManager). Requires network-manager
installed in the container (see apps/api/Dockerfile) and the host's
D-Bus system bus reachable (bind-mounted - see docker-compose.yml's
comment) - a real host-privilege tradeoff, the same category as the
Docker socket in modules/servers. Linux-only; gracefully reports
"unavailable" rather than crashing when `nmcli` isn't found, which is
always true on this project's Windows dev machine."""

from __future__ import annotations

import asyncio
import shutil
from dataclasses import dataclass
from typing import Any


def is_available() -> bool:
    return shutil.which("nmcli") is not None


@dataclass
class WifiNetwork:
    ssid: str
    signal: int
    secure: bool
    in_use: bool


def network_to_payload(network: WifiNetwork) -> dict[str, Any]:
    return {"ssid": network.ssid, "signal": network.signal, "secure": network.secure, "inUse": network.in_use}


async def _run(*args: str) -> tuple[int, str, str]:
    process = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    return process.returncode or 0, stdout.decode(errors="replace"), stderr.decode(errors="replace")


def _split_nmcli_fields(line: str) -> list[str]:
    """nmcli's terse (`-t`) output escapes literal colons within a
    field with a backslash - an SSID can legitimately contain one, so a
    naive `line.split(":")` would misparse it."""
    fields: list[str] = []
    current: list[str] = []
    escaped = False
    for char in line:
        if escaped:
            current.append(char)
            escaped = False
        elif char == "\\":
            escaped = True
        elif char == ":":
            fields.append("".join(current))
            current = []
        else:
            current.append(char)
    fields.append("".join(current))
    return fields


def parse_wifi_list(output: str) -> list[WifiNetwork]:
    """Parses `nmcli -t -f IN-USE,SSID,SIGNAL,SECURITY device wifi
    list` output - one line per access point seen, deduplicated by
    SSID (multiple access points can share one network name) keeping
    the strongest signal, sorted strongest-first."""
    best_by_ssid: dict[str, WifiNetwork] = {}
    for line in output.splitlines():
        fields = _split_nmcli_fields(line)
        if len(fields) < 4:
            continue
        in_use, ssid, signal_str, security = fields[0], fields[1], fields[2], fields[3]
        if not ssid:
            continue
        signal = int(signal_str) if signal_str.isdigit() else 0
        network = WifiNetwork(ssid=ssid, signal=signal, secure=bool(security.strip()), in_use=in_use.strip() == "*")
        existing = best_by_ssid.get(ssid)
        if existing is None or network.signal > existing.signal or network.in_use:
            best_by_ssid[ssid] = network
    return sorted(best_by_ssid.values(), key=lambda network: network.signal, reverse=True)


async def list_networks() -> list[WifiNetwork] | None:
    """None means nmcli isn't available - distinct from an empty scan."""
    if not is_available():
        return None
    returncode, stdout, _stderr = await _run(
        "nmcli", "-t", "-f", "IN-USE,SSID,SIGNAL,SECURITY", "device", "wifi", "list"
    )
    if returncode != 0:
        return []
    return parse_wifi_list(stdout)


async def _wifi_device_name() -> str | None:
    returncode, stdout, _stderr = await _run("nmcli", "-t", "-f", "DEVICE,TYPE", "device", "status")
    if returncode != 0:
        return None
    for line in stdout.splitlines():
        parts = line.split(":")
        if len(parts) >= 2 and parts[1] == "wifi":
            return parts[0]
    return None


async def connect(ssid: str, password: str | None) -> tuple[bool, str]:
    if not is_available():
        return False, "NetworkManager (nmcli) isn't available."
    args = ["nmcli", "device", "wifi", "connect", ssid]
    if password:
        args += ["password", password]
    returncode, stdout, stderr = await _run(*args)
    return returncode == 0, (stdout or stderr).strip()


async def disconnect() -> tuple[bool, str]:
    if not is_available():
        return False, "NetworkManager (nmcli) isn't available."
    device = await _wifi_device_name()
    if device is None:
        return False, "No WiFi device found."
    returncode, stdout, stderr = await _run("nmcli", "device", "disconnect", device)
    return returncode == 0, (stdout or stderr).strip()
