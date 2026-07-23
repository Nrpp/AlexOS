"""Mock weather data source. The rest of the module only ever calls
`provider.read()` - swapping this class for one that calls a real
provider is the entire migration to live data."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any

_CONDITIONS = [
    ("clear", "clear_day"),
    ("partly cloudy", "partly_cloudy_day"),
    ("cloudy", "cloudy"),
    ("light rain", "rainy"),
]


@dataclass
class WeatherReading:
    condition: str
    icon: str
    temperature: float
    high: float
    low: float
    location: str
    units: str


def reading_to_payload(reading: WeatherReading) -> dict[str, Any]:
    return {
        "condition": reading.condition,
        "icon": reading.icon,
        "temperature": reading.temperature,
        "high": reading.high,
        "low": reading.low,
        "location": reading.location,
        "units": reading.units,
    }


class MockWeatherProvider:
    def __init__(self) -> None:
        self.location = "Home"
        self.units = "metric"
        self._temperature = 18.0

    def configure(self, config: dict[str, Any]) -> None:
        self.location = config.get("location", self.location)
        self.units = config.get("units", self.units)
        self._temperature = 18.0 if self.units == "metric" else 64.0

    def read(self) -> WeatherReading:
        condition, icon = random.choice(_CONDITIONS)
        self._temperature += random.uniform(-0.6, 0.6)
        return WeatherReading(
            condition=condition,
            icon=icon,
            temperature=round(self._temperature, 1),
            high=round(self._temperature + random.uniform(1, 4), 1),
            low=round(self._temperature - random.uniform(1, 4), 1),
            location=self.location,
            units=self.units,
        )


provider = MockWeatherProvider()
