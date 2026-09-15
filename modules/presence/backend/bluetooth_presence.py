"""Bluetooth-based presence: an alternative/complement to the phone-
reported webhook and OwnTracks paths (see README's "Why this design").
Instead of waiting for the phone to report a geofence crossing, the Pi
itself periodically checks whether a device's classic Bluetooth radio
answers a ping - the same technique Home Assistant's classic
`bluetooth_tracker` integration uses (`l2ping`, from the same `bluez`
package `modules/control_center` already depends on).

Deliberately targets a device's *classic* Bluetooth (BR/EDR) address,
not BLE - iOS/Android rotate the BLE address used for scanning/
advertising for privacy, but the classic BR/EDR address (what phones
use for calls, audio, tethering, ...) stays fixed, so it keeps working
without the phone needing to be paired, connected, or even
discoverable; it only needs Bluetooth turned on. Find a phone's classic
address by pairing it once with the Pi via `modules/control_center`'s
Bluetooth widget - see this module's README.

Gracefully reports "unavailable" (not a crash) if `l2ping` isn't
installed - same convention as
`modules/control_center/backend/bluetooth.py`."""

from __future__ import annotations

import asyncio
import re
import shutil

_ADDRESS_RE = re.compile(r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")


def is_available() -> bool:
    return shutil.which("l2ping") is not None


def normalize_address(address: str | None) -> str | None:
    """Upper-cases and validates a MAC-shaped address
    (`AA:BB:CC:DD:EE:FF`). Returns None for empty/invalid input, so
    callers can use it both to clean up a value to store and to
    reject a bad one."""
    if not address:
        return None
    candidate = address.strip().upper()
    return candidate if _ADDRESS_RE.match(candidate) else None


async def ping(address: str, timeout_seconds: float = 5.0) -> bool:
    """True if `address` answered a single L2CAP echo within
    timeout_seconds - proof it's currently in Bluetooth range, whether
    or not it's paired/connected to this Pi. `l2ping` needs direct
    access to the host's Bluetooth adapter (the same D-Bus/host
    integration tradeoff `modules/control_center` already documents),
    and is deliberately run one device at a time by the tick loop that
    calls this - Bluetooth is a single shared radio, and pinging
    several addresses concurrently is unreliable."""
    if not is_available():
        return False
    try:
        process = await asyncio.create_subprocess_exec(
            "l2ping",
            "-c",
            "1",
            "-t",
            str(max(1, int(timeout_seconds))),
            address,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        returncode = await asyncio.wait_for(process.wait(), timeout=timeout_seconds + 2)
    except (asyncio.TimeoutError, OSError):
        return False
    return returncode == 0
