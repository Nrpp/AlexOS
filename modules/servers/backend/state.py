"""Simulated host stats. See the module README for why this isn't
psutil-backed yet, and what a real implementation would need."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any


@dataclass
class ServerStats:
    cpu_percent: float
    ram_used_gb: float
    ram_total_gb: float
    disk_used_gb: float
    disk_total_gb: float
    temperature_c: float


def stats_to_payload(stats: ServerStats) -> dict[str, Any]:
    return {
        "cpuPercent": stats.cpu_percent,
        "ramUsedGb": stats.ram_used_gb,
        "ramTotalGb": stats.ram_total_gb,
        "diskUsedGb": stats.disk_used_gb,
        "diskTotalGb": stats.disk_total_gb,
        "temperatureC": stats.temperature_c,
    }


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


class MockServerStatsProvider:
    def __init__(self) -> None:
        self.ram_total_gb = 8.0
        self.disk_total_gb = 128.0
        self._cpu_percent = 12.0
        self._ram_used_gb = 2.4
        self._disk_used_gb = 34.0
        self._temperature_c = 42.0

    def configure(self, config: dict[str, Any]) -> None:
        self.ram_total_gb = config.get("ramTotalGb", self.ram_total_gb)
        self.disk_total_gb = config.get("diskTotalGb", self.disk_total_gb)

    def read(self) -> ServerStats:
        self._cpu_percent = _clamp(self._cpu_percent + random.uniform(-4, 4), 3, 92)
        self._ram_used_gb = _clamp(
            self._ram_used_gb + random.uniform(-0.15, 0.15), 0.5, self.ram_total_gb - 0.2
        )
        self._disk_used_gb = _clamp(self._disk_used_gb + random.uniform(0, 0.02), 1, self.disk_total_gb - 1)
        self._temperature_c = _clamp(self._temperature_c + random.uniform(-0.8, 0.8), 35, 68)
        return ServerStats(
            cpu_percent=round(self._cpu_percent, 1),
            ram_used_gb=round(self._ram_used_gb, 2),
            ram_total_gb=self.ram_total_gb,
            disk_used_gb=round(self._disk_used_gb, 1),
            disk_total_gb=self.disk_total_gb,
            temperature_c=round(self._temperature_c, 1),
        )


provider = MockServerStatsProvider()
