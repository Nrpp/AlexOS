"""The presence module's backend. Most of it is driven by an inbound
webhook call or a Settings action - no background work needed for
that. Bluetooth presence is the one exception: it's the Pi actively
checking on a device instead of waiting for it to report in, so
`on_load` also starts a periodic tick loop (same shape as
modules/tailscale's), reading/writing device state directly via the
Storage Manager `on_load` is given (see module_manager.py's
`storage_manager` keyword-parameter note and docs/MODULES.md) rather
than through `request.app.state`, since there's no request behind a
background tick."""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.event_bus import EventBus
from app.core.storage_manager import StorageManager

from . import bluetooth_presence
from .config_store import (
    bluetooth_misses_before_leave,
    bluetooth_ping_timeout_seconds,
    bluetooth_poll_interval_seconds,
    configure,
)
from .router import router
from .state import compute_status, list_devices, record_event

__all__ = ["router", "on_load"]

# Consecutive-miss counts per device, kept in memory only (not
# persisted): a container restart mid-away just costs one extra poll
# cycle before "leave" is re-confirmed, which isn't worth a storage
# round trip on every tick.
_miss_counts: dict[str, int] = {}


def on_load(event_bus: EventBus, config: dict[str, Any], storage_manager: StorageManager) -> None:
    configure(config)
    asyncio.create_task(_bluetooth_tick_forever(event_bus, storage_manager))


async def _bluetooth_tick_forever(event_bus: EventBus, storage: StorageManager) -> None:
    while True:
        await _bluetooth_tick_once(event_bus, storage)
        await asyncio.sleep(bluetooth_poll_interval_seconds())


async def _bluetooth_tick_once(event_bus: EventBus, storage: StorageManager) -> None:
    """Pings every device that has a Bluetooth address configured, one
    at a time (Bluetooth is a single shared radio - see
    bluetooth_presence.ping's docstring). A reachable device is marked
    "arrive" immediately (and its `lastSeen` refreshed even if it was
    already "arrive" - a successful ping is real proof of life). An
    unreachable one only flips to "leave" after
    `bluetoothMissesBeforeLeave` *consecutive* misses, so a single
    dropped ping (real-world Bluetooth is flaky) doesn't bounce the
    dashboard into away mode - see config.json's comment on that
    tunable. Publishes `presence.updated` only when a device's event
    actually changed, not on every tick, so this doesn't spam the
    Event Bus once a minute for every device that's simply still home."""
    if not bluetooth_presence.is_available():
        return
    devices = await list_devices(storage)
    changed = False
    for device in devices:
        address = device.get("bluetoothAddress")
        if not address:
            continue
        device_id = device["id"]
        previous_event = device.get("event")
        in_range = await bluetooth_presence.ping(address, bluetooth_ping_timeout_seconds())
        if in_range:
            _miss_counts[device_id] = 0
            await record_event(storage, device_id, "arrive")
            if previous_event != "arrive":
                changed = True
        else:
            misses = _miss_counts.get(device_id, 0) + 1
            _miss_counts[device_id] = misses
            if misses >= bluetooth_misses_before_leave() and previous_event != "leave":
                await record_event(storage, device_id, "leave", touch_last_seen=False)
                changed = True

    if changed:
        status = await compute_status(storage)
        await event_bus.publish("presence.updated", status, source="presence", retain=True)
