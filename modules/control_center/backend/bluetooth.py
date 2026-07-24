"""Bluetooth control via `bluetoothctl` (BlueZ). Requires bluez
installed in the container (see apps/api/Dockerfile) and the host's
D-Bus system bus reachable (same bind-mount as WiFi - see
docker-compose.yml). Linux-only, and specifically needs a modern BlueZ
(5.48+) where `bluetoothctl pair/trust/connect/remove <address>` work
as direct non-interactive subcommands rather than only inside the
interactive REPL. Gracefully reports "unavailable" rather than crashing
when `bluetoothctl` isn't found."""

from __future__ import annotations

import asyncio
import re
import shutil
from dataclasses import dataclass
from typing import Any

_DEVICE_LINE_RE = re.compile(r"^Device\s+([0-9A-Fa-f:]{17})\s+(.*)$")


def is_available() -> bool:
    return shutil.which("bluetoothctl") is not None


@dataclass
class BluetoothDevice:
    address: str
    name: str
    paired: bool
    connected: bool


def device_to_payload(device: BluetoothDevice) -> dict[str, Any]:
    return {
        "address": device.address,
        "name": device.name,
        "paired": device.paired,
        "connected": device.connected,
    }


async def _run(*args: str, timeout: float = 15.0) -> tuple[int, str, str]:
    process = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        process.kill()
        return 1, "", "Timed out"
    return process.returncode or 0, stdout.decode(errors="replace"), stderr.decode(errors="replace")


def parse_devices(output: str) -> dict[str, str]:
    """Returns {address: name} from `bluetoothctl devices` output,
    whose lines look like "Device AA:BB:CC:DD:EE:FF Some Device Name"."""
    devices: dict[str, str] = {}
    for line in output.splitlines():
        match = _DEVICE_LINE_RE.match(line.strip())
        if match:
            devices[match.group(1)] = match.group(2)
    return devices


def parse_info(output: str) -> dict[str, bool]:
    """Returns {"paired": bool, "connected": bool} from `bluetoothctl
    info <address>` output."""
    return {"paired": "Paired: yes" in output, "connected": "Connected: yes" in output}


async def list_devices() -> list[BluetoothDevice] | None:
    """None means bluetoothctl isn't available - distinct from no
    known devices."""
    if not is_available():
        return None
    returncode, stdout, _stderr = await _run("bluetoothctl", "devices")
    if returncode != 0:
        return []
    names_by_address = parse_devices(stdout)
    devices: list[BluetoothDevice] = []
    for address, name in names_by_address.items():
        _returncode, info, _stderr = await _run("bluetoothctl", "info", address)
        status = parse_info(info)
        devices.append(BluetoothDevice(address=address, name=name, paired=status["paired"], connected=status["connected"]))
    return devices


async def scan(seconds: float = 8.0) -> bool:
    """Scans for nearby devices for `seconds`, then stops - newly
    discovered devices then show up in `bluetoothctl devices`."""
    if not is_available():
        return False
    process = await asyncio.create_subprocess_exec(
        "bluetoothctl", "scan", "on", stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL
    )
    await asyncio.sleep(seconds)
    process.terminate()
    try:
        await asyncio.wait_for(process.wait(), timeout=3)
    except asyncio.TimeoutError:
        process.kill()
    return True


async def pair(address: str) -> tuple[bool, str]:
    if not is_available():
        return False, "bluetoothctl isn't available."
    returncode, stdout, stderr = await _run("bluetoothctl", "pair", address)
    if returncode != 0:
        return False, (stderr or stdout).strip()
    await _run("bluetoothctl", "trust", address)
    returncode, stdout, stderr = await _run("bluetoothctl", "connect", address)
    return returncode == 0, (stdout or stderr).strip()


async def remove(address: str) -> tuple[bool, str]:
    if not is_available():
        return False, "bluetoothctl isn't available."
    returncode, stdout, stderr = await _run("bluetoothctl", "remove", address)
    return returncode == 0, (stdout or stderr).strip()
