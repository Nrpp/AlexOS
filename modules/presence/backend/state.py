"""Presence storage: devices, the primary device, the PIN, and the
unlock session - all persisted via the Core Storage Manager's generic
module-data table (same small pattern as modules/notes and
modules/study, duplicated rather than shared since modules are
independently loaded and don't import each other).

Fails safe throughout: with no device ever reported, `home` stays
False and the dashboard stays locked - see `compute_status`.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.storage_manager import StorageManager

from .config_store import stale_after_hours
from .security import generate_device_id, generate_device_token, hash_pin, verify_pin

MODULE_NAME = "presence"
_DEVICES_KEY = "devices"
_PRIMARY_KEY = "primary_device_id"
_PIN_KEY = "pin"
_UNLOCK_KEY = "unlocked_until"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


# --- Devices -----------------------------------------------------------


async def list_devices(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _DEVICES_KEY)
    return json.loads(raw) if raw else []


async def _save_devices(storage: StorageManager, devices: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _DEVICES_KEY, json.dumps(devices))


async def get_device(storage: StorageManager, device_id: str) -> dict[str, Any] | None:
    devices = await list_devices(storage)
    return next((device for device in devices if device["id"] == device_id), None)


async def create_device(storage: StorageManager, name: str) -> dict[str, Any]:
    devices = await list_devices(storage)
    existing_ids = {device["id"] for device in devices}
    device_id = generate_device_id(name)
    while device_id in existing_ids:
        device_id = generate_device_id(name)
    device = {
        "id": device_id,
        "name": name,
        "token": generate_device_token(),
        "event": None,
        "lastSeen": None,
        "lastEventAt": None,
        "bluetoothAddress": None,
        # Which reported signal(s) are allowed to actually move this
        # device's event/lastEventAt - both default on, so a freshly-
        # added device behaves exactly like before this setting existed:
        # whatever's configured (webhook/OwnTracks and/or a Bluetooth
        # address) just works. See set_device_presence_methods.
        "locationEnabled": True,
        "bluetoothEnabled": True,
        "createdAt": _iso(_now()),
    }
    devices.append(device)
    await _save_devices(storage, devices)
    return device


async def rename_device(storage: StorageManager, device_id: str, name: str) -> dict[str, Any] | None:
    devices = await list_devices(storage)
    for device in devices:
        if device["id"] == device_id:
            device["name"] = name
            await _save_devices(storage, devices)
            return device
    return None


async def set_device_bluetooth_address(
    storage: StorageManager, device_id: str, address: str | None
) -> dict[str, Any] | None:
    """`address` must already be normalized/validated by the caller
    (see `bluetooth_presence.normalize_address`) - this just stores it,
    or clears it back to None to stop Bluetooth-presence polling for
    this device."""
    devices = await list_devices(storage)
    for device in devices:
        if device["id"] == device_id:
            device["bluetoothAddress"] = address
            await _save_devices(storage, devices)
            return device
    return None


async def set_device_presence_methods(
    storage: StorageManager, device_id: str, *, location_enabled: bool, bluetooth_enabled: bool
) -> dict[str, Any] | None:
    """Which of this device's configured signal(s) are allowed to
    actually drive home/away: the webhook/OwnTracks path
    (`location_enabled`) and/or Bluetooth-presence polling
    (`bluetooth_enabled`). Turning one off doesn't remove its
    underlying setup (the device's token, or its bluetoothAddress) -
    it's a pause, not a delete, so re-enabling it later needs no
    re-pairing or re-configuring the phone's automation. Both default
    True (see create_device) - disabling one only matters once the
    corresponding signal is actually configured; a device with no
    bluetoothAddress ignores `bluetooth_enabled` either way."""
    devices = await list_devices(storage)
    for device in devices:
        if device["id"] == device_id:
            device["locationEnabled"] = location_enabled
            device["bluetoothEnabled"] = bluetooth_enabled
            await _save_devices(storage, devices)
            return device
    return None


async def delete_device(storage: StorageManager, device_id: str) -> bool:
    devices = await list_devices(storage)
    remaining = [device for device in devices if device["id"] != device_id]
    if len(remaining) == len(devices):
        return False
    await _save_devices(storage, remaining)
    if await get_primary_device_id(storage) == device_id:
        await set_primary_device_id(storage, None)
    return True


async def record_event(
    storage: StorageManager, device_id: str, event: str, *, touch_last_seen: bool = True
) -> dict[str, Any] | None:
    """`touch_last_seen=False` is for a transition *inferred* from an
    absence of contact - Bluetooth presence's "leave" once a device
    stops answering pings (see `bluetooth_presence.py`) - where
    stamping `lastSeen` as "now" would be a lie: nothing was actually
    heard from the device just now, that's the whole reason it's being
    marked away. Every other caller (the webhook, OwnTracks) is a
    transition the phone itself just reported, i.e. real contact, so
    they keep the default of also refreshing `lastSeen`."""
    devices = await list_devices(storage)
    for device in devices:
        if device["id"] == device_id:
            now = _iso(_now())
            device["event"] = event
            device["lastEventAt"] = now
            if touch_last_seen:
                device["lastSeen"] = now
            await _save_devices(storage, devices)
            return device
    return None


async def touch_device(storage: StorageManager, device_id: str) -> dict[str, Any] | None:
    """Updates lastSeen only, leaving `event`/`lastEventAt` (home/away and
    when it last changed) untouched. Used for OwnTracks' plain
    `_type: "location"` beacons, which fire on a timer regardless of
    whether the phone crossed a Region - we still don't do geofence math
    ourselves, so a location ping alone must never flip home/away, only
    prove the device is still reporting.

    Keeping lastSeen (any ping) separate from lastEventAt (last arrive/
    leave) matters for diagnosing exactly the failure mode this was
    added for: a device that's reporting fine (lastSeen recent) but
    whose Region/"Share" isn't actually configured in OwnTracks, so no
    transition ever fires and `event` stays stuck on a stale value -
    without the split, a recent `lastSeen` on a stale "leave" device
    looks identical to a working one, and there's no way to tell "not
    receiving anything" apart from "receiving beacons but never a
    transition" from the outside."""
    devices = await list_devices(storage)
    for device in devices:
        if device["id"] == device_id:
            device["lastSeen"] = _iso(_now())
            await _save_devices(storage, devices)
            return device
    return None


# --- Primary device ------------------------------------------------------


async def get_primary_device_id(storage: StorageManager) -> str | None:
    raw = await storage.get_module_data(MODULE_NAME, _PRIMARY_KEY)
    return raw or None


async def set_primary_device_id(storage: StorageManager, device_id: str | None) -> None:
    await storage.set_module_data(MODULE_NAME, _PRIMARY_KEY, device_id or "")


# --- PIN -------------------------------------------------------------------


async def is_pin_configured(storage: StorageManager) -> bool:
    raw = await storage.get_module_data(MODULE_NAME, _PIN_KEY)
    return bool(raw)


async def set_pin(storage: StorageManager, pin: str) -> None:
    await storage.set_module_data(MODULE_NAME, _PIN_KEY, json.dumps(hash_pin(pin)))


async def verify_stored_pin(storage: StorageManager, pin: str) -> bool:
    raw = await storage.get_module_data(MODULE_NAME, _PIN_KEY)
    if not raw:
        return False
    return verify_pin(pin, json.loads(raw))


# --- Unlock session ----------------------------------------------------------


async def unlock(storage: StorageManager, ttl_minutes: float) -> str:
    until = _iso(_now() + timedelta(minutes=ttl_minutes))
    await storage.set_module_data(MODULE_NAME, _UNLOCK_KEY, until)
    return until


async def lock(storage: StorageManager) -> None:
    await storage.set_module_data(MODULE_NAME, _UNLOCK_KEY, "")


async def is_unlocked(storage: StorageManager) -> bool:
    raw = await storage.get_module_data(MODULE_NAME, _UNLOCK_KEY)
    if not raw:
        return False
    try:
        until = datetime.fromisoformat(raw)
    except ValueError:
        return False
    return _now() < until


# --- Status --------------------------------------------------------------


def _is_stale(last_seen_iso: str | None, max_age_hours: float) -> bool:
    """The safety fallback: a primary device that hasn't reported in
    over `max_age_hours` (its phone died, lost signal, automation got
    disabled, ...) is treated as unknown, not "still home" - fails
    toward privacy, never the other way. `max_age_hours <= 0` disables
    the check entirely (trust the last event no matter its age)."""
    if last_seen_iso is None or max_age_hours <= 0:
        return False
    try:
        last_seen = datetime.fromisoformat(last_seen_iso)
    except ValueError:
        return True
    return _now() - last_seen > timedelta(hours=max_age_hours)


async def compute_status(storage: StorageManager) -> dict[str, Any]:
    devices = await list_devices(storage)
    primary_id = await get_primary_device_id(storage)
    primary = next((device for device in devices if device["id"] == primary_id), None)

    # home = primary device's last event is "arrive", and not stale.
    # No primary device, or no device having ever reported, both fall
    # through to the same fail-safe default: not home.
    home = bool(
        primary is not None
        and primary.get("event") == "arrive"
        and not _is_stale(primary.get("lastSeen"), stale_after_hours())
    )
    # Locking is meaningless (and dangerous) before a PIN exists to unlock
    # with: on first install, nobody has reported "home" yet AND no PIN is
    # set, so a naive `(not home)` here would lock the dashboard - Settings
    # included - with no way back in short of a raw API call. A PIN can
    # only be set from Settings, so away-mode must stay off (unlocked)
    # until that PIN actually exists.
    pin_configured = await is_pin_configured(storage)
    locked = (not home) and pin_configured and not await is_unlocked(storage)

    return {
        "locked": locked,
        "home": home,
        "primaryDeviceId": primary_id,
        "pinConfigured": pin_configured,
        "devices": [
            {
                "id": device["id"],
                "name": device["name"],
                "event": device.get("event"),
                "lastSeen": device.get("lastSeen"),
                "lastEventAt": device.get("lastEventAt"),
                "bluetoothAddress": device.get("bluetoothAddress"),
                "locationEnabled": device.get("locationEnabled", True),
                "bluetoothEnabled": device.get("bluetoothEnabled", True),
            }
            for device in devices
        ],
    }
