"""Simulated network stats. See the module README for why real device
discovery isn't wired up yet."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any

_DEVICE_COUNT = 5


@dataclass
class NetworkStats:
    devices_online: int
    devices_total: int
    download_mbps: float
    upload_mbps: float
    latency_ms: float
    public_ip: str
    internal_ip: str


def stats_to_payload(stats: NetworkStats) -> dict[str, Any]:
    return {
        "devicesOnline": stats.devices_online,
        "devicesTotal": stats.devices_total,
        "downloadMbps": stats.download_mbps,
        "uploadMbps": stats.upload_mbps,
        "latencyMs": stats.latency_ms,
        "publicIp": stats.public_ip,
        "internalIp": stats.internal_ip,
    }


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


class MockNetworkProvider:
    def __init__(self) -> None:
        self.public_ip = "203.0.113.42"
        self.internal_ip = "192.168.1.42"
        self._download_mbps = 180.0
        self._upload_mbps = 22.0
        self._latency_ms = 14.0

    def configure(self, config: dict[str, Any]) -> None:
        self.public_ip = config.get("publicIp", self.public_ip)
        self.internal_ip = config.get("internalIp", self.internal_ip)

    def read(self) -> NetworkStats:
        self._download_mbps = _clamp(self._download_mbps + random.uniform(-8, 8), 40, 300)
        self._upload_mbps = _clamp(self._upload_mbps + random.uniform(-2, 2), 5, 40)
        self._latency_ms = _clamp(self._latency_ms + random.uniform(-2, 2), 4, 60)
        return NetworkStats(
            devices_online=random.randint(3, _DEVICE_COUNT),
            devices_total=_DEVICE_COUNT,
            download_mbps=round(self._download_mbps, 1),
            upload_mbps=round(self._upload_mbps, 1),
            latency_ms=round(self._latency_ms, 1),
            public_ip=self.public_ip,
            internal_ip=self.internal_ip,
        )


provider = MockNetworkProvider()
