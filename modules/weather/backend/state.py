"""Real weather via Open-Meteo (https://open-meteo.com) - free, no API
key required. See the module README for how to set your coordinates."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# WMO weather codes -> (condition, Material Symbols Rounded icon).
# https://open-meteo.com/en/docs (see "WMO Weather interpretation codes")
_WEATHER_CODES: dict[int, tuple[str, str]] = {
    0: ("clear", "clear_day"),
    1: ("mainly clear", "clear_day"),
    2: ("partly cloudy", "partly_cloudy_day"),
    3: ("overcast", "cloudy"),
    45: ("fog", "foggy"),
    48: ("fog", "foggy"),
    51: ("light drizzle", "rainy"),
    53: ("drizzle", "rainy"),
    55: ("dense drizzle", "rainy"),
    61: ("light rain", "rainy"),
    63: ("rain", "rainy"),
    65: ("heavy rain", "rainy"),
    71: ("light snow", "weather_snowy"),
    73: ("snow", "weather_snowy"),
    75: ("heavy snow", "weather_snowy"),
    80: ("rain showers", "rainy"),
    81: ("rain showers", "rainy"),
    82: ("violent rain showers", "rainy"),
    95: ("thunderstorm", "thunderstorm"),
    96: ("thunderstorm with hail", "thunderstorm"),
    99: ("thunderstorm with hail", "thunderstorm"),
}
_UNKNOWN_CONDITION = ("unknown", "help")


def describe_weather_code(code: int) -> tuple[str, str]:
    return _WEATHER_CODES.get(code, _UNKNOWN_CONDITION)


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


class OpenMeteoProvider:
    def __init__(self) -> None:
        # Placeholder coordinates - see the module README, edit config.json to your own.
        self.latitude = 40.4168
        self.longitude = -3.7038
        self.location = "Madrid"
        self.units = "metric"
        self._last_reading: WeatherReading | None = None

    def configure(self, config: dict[str, Any]) -> None:
        self.latitude = config.get("latitude", self.latitude)
        self.longitude = config.get("longitude", self.longitude)
        self.location = config.get("location", self.location)
        self.units = config.get("units", self.units)

    async def read(self) -> WeatherReading:
        params = {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "current": "temperature_2m,weather_code",
            "daily": "temperature_2m_max,temperature_2m_min",
            "temperature_unit": "fahrenheit" if self.units == "imperial" else "celsius",
            "timezone": "auto",
            "forecast_days": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(_FORECAST_URL, params=params)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError:
            if self._last_reading is not None:
                return self._last_reading
            raise

        condition, icon = describe_weather_code(data["current"]["weather_code"])
        reading = WeatherReading(
            condition=condition,
            icon=icon,
            temperature=round(data["current"]["temperature_2m"], 1),
            high=round(data["daily"]["temperature_2m_max"][0], 1),
            low=round(data["daily"]["temperature_2m_min"][0], 1),
            location=self.location,
            units=self.units,
        )
        self._last_reading = reading
        return reading


provider = OpenMeteoProvider()
