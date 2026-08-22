"""Bluetooth control via `bluetoothctl` (BlueZ). Requires bluez
installed in the container (see apps/api/Dockerfile) and the host's
D-Bus system bus reachable (same bind-mount as WiFi - see
docker-compose.yml). Linux-only, and specifically needs a modern BlueZ
(5.48+) where `bluetoothctl pair/trust/connect/remove/power/discoverable/
pairable/show <args>` work as direct non-interactive subcommands
rather than only inside the interactive REPL. Gracefully reports
"unavailable" rather than crashing when `bluetoothctl` isn't found."""

from __future__ import annotations

import asyncio
import re
import shutil
from dataclasses import dataclass
from typing import Any

_DEVICE_LINE_RE = re.compile(r"^Device\s+([0-9A-Fa-f:]{17})\s+(.*)$")

# The A2DP "Audio Sink" service - what a phone advertises when it can
# stream music *to* this device, i.e. treat the Pi as a speaker. BlueZ
# lists it as a UUID line in `bluetoothctl info <address>` output, e.g.
# "UUID: Audio Sink               (0000110b-0000-1000-8000-00805f9b34fb)".
_AUDIO_SINK_UUID = "0000110b-0000-1000-8000-00805f9b34fb"


def is_available() -> bool:
    return shutil.which("bluetoothctl") is not None


@dataclass
class BluetoothDevice:
    address: str
    name: str
    paired: bool
    connected: bool
    audio_capable: bool


def device_to_payload(device: BluetoothDevice) -> dict[str, Any]:
    return {
        "address": device.address,
        "name": device.name,
        "paired": device.paired,
        "connected": device.connected,
        "audioCapable": device.audio_capable,
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
    """Returns {"paired": bool, "connected": bool, "audioCapable": bool}
    from `bluetoothctl info <address>` output. `audioCapable` means the
    device advertises the A2DP Audio Sink service - i.e. it can stream
    music *to* this Pi, treating it as a speaker - not just that it's
    some paired/connected Bluetooth accessory (a keyboard or a phone
    used only for its own Personal Area Networking profile wouldn't
    count)."""
    return {
        "paired": "Paired: yes" in output,
        "connected": "Connected: yes" in output,
        "audioCapable": _AUDIO_SINK_UUID in output.lower(),
    }


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
        devices.append(
            BluetoothDevice(
                address=address,
                name=name,
                paired=status["paired"],
                connected=status["connected"],
                audio_capable=status["audioCapable"],
            )
        )
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


# --- "Bluetooth speaker" mode: adapter power/discoverable/pairable ---------
#
# This only controls whether *new* devices can find and pair with the Pi -
# it does NOT route audio anywhere by itself. Actually turning received
# A2DP audio into sound needs a one-time OS-level setup on the Pi itself
# (PipeWire/WirePlumber + the Bluetooth audio module, outside anything a
# containerized API can configure) - see modules/control_center/README.md's
# "Bluetooth speaker" section for that part. What's here just makes the Pi
# discoverable/pairable so a phone can find and connect to it in the first
# place, using the same bluetoothctl this file already uses for scan/pair.


def parse_adapter_state(output: str) -> dict[str, bool]:
    """Returns {"powered", "discoverable", "pairable"} from
    `bluetoothctl show` output (the default/first controller - correct
    for a Pi, which normally has exactly one)."""
    return {
        "powered": "Powered: yes" in output,
        "discoverable": "Discoverable: yes" in output,
        "pairable": "Pairable: yes" in output,
    }


async def get_adapter_state() -> dict[str, bool] | None:
    """None means bluetoothctl isn't available - same convention as
    list_devices()."""
    if not is_available():
        return None
    returncode, stdout, _stderr = await _run("bluetoothctl", "show")
    if returncode != 0:
        return {"powered": False, "discoverable": False, "pairable": False}
    return parse_adapter_state(stdout)


async def set_speaker_mode(enabled: bool) -> tuple[bool, str]:
    """Turning it on: powers the adapter on (if it wasn't already) and
    makes it discoverable and pairable, so a phone can find and connect
    to it as a speaker. Turning it off only stops NEW pairings
    (discoverable/pairable off) - it deliberately leaves the adapter
    powered and any already-trusted device able to reconnect on its
    own, since "stop advertising to new phones" and "disconnect the one
    already playing music" are different actions and conflating them
    would be surprising."""
    if not is_available():
        return False, "bluetoothctl isn't available."

    if enabled:
        returncode, stdout, stderr = await _run("bluetoothctl", "power", "on")
        if returncode != 0:
            return False, (stderr or stdout).strip() or "Couldn't power on the Bluetooth adapter."
        await _run("bluetoothctl", "pairable", "on")
        returncode, stdout, stderr = await _run("bluetoothctl", "discoverable", "on")
    else:
        await _run("bluetoothctl", "pairable", "off")
        returncode, stdout, stderr = await _run("bluetoothctl", "discoverable", "off")

    return returncode == 0, (stdout or stderr).strip()
