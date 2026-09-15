"""Non-secret tunables from config.json. Route handlers can't receive
`on_load`'s `config` dict directly (only `on_load` itself gets it), so
this is a tiny module-level store the same way modules/room's
`HomeAssistantClient.configure()` holds config.json's `lightEntityIds`
for its route handlers to read later."""

from __future__ import annotations

from typing import Any

DEFAULT_UNLOCK_TTL_MINUTES = 15
DEFAULT_STALE_AFTER_HOURS = 24.0
DEFAULT_BLUETOOTH_POLL_INTERVAL_SECONDS = 30.0
DEFAULT_BLUETOOTH_PING_TIMEOUT_SECONDS = 5.0
DEFAULT_BLUETOOTH_MISSES_BEFORE_LEAVE = 3

_config: dict[str, Any] = {
    "unlockTtlMinutes": DEFAULT_UNLOCK_TTL_MINUTES,
    "staleAfterHours": DEFAULT_STALE_AFTER_HOURS,
    "bluetoothPollIntervalSeconds": DEFAULT_BLUETOOTH_POLL_INTERVAL_SECONDS,
    "bluetoothPingTimeoutSeconds": DEFAULT_BLUETOOTH_PING_TIMEOUT_SECONDS,
    "bluetoothMissesBeforeLeave": DEFAULT_BLUETOOTH_MISSES_BEFORE_LEAVE,
}


def configure(config: dict[str, Any]) -> None:
    _config.update(config)


def unlock_ttl_minutes() -> float:
    return _config.get("unlockTtlMinutes", DEFAULT_UNLOCK_TTL_MINUTES)


def stale_after_hours() -> float:
    return _config.get("staleAfterHours", DEFAULT_STALE_AFTER_HOURS)


def bluetooth_poll_interval_seconds() -> float:
    return _config.get("bluetoothPollIntervalSeconds", DEFAULT_BLUETOOTH_POLL_INTERVAL_SECONDS)


def bluetooth_ping_timeout_seconds() -> float:
    return _config.get("bluetoothPingTimeoutSeconds", DEFAULT_BLUETOOTH_PING_TIMEOUT_SECONDS)


def bluetooth_misses_before_leave() -> int:
    return _config.get("bluetoothMissesBeforeLeave", DEFAULT_BLUETOOTH_MISSES_BEFORE_LEAVE)
