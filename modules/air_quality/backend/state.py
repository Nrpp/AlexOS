"""Real air quality via Open-Meteo's Air Quality API - free, no API
key. Shares the lat/long config pattern with modules/weather (a
separate config.json, not a shared import - modules are independently
loaded and don't import each other)."""

from __future__ import annotations

from typing import Any

import httpx

_API_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"


class AirQualityProvider:
    def __init__(self) -> None:
        self.latitude = 40.4168
        self.longitude = -3.7038

    def configure(self, config: dict[str, Any]) -> None:
        self.latitude = config.get("latitude", self.latitude)
        self.longitude = config.get("longitude", self.longitude)

    async def read(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                _API_URL,
                params={
                    "latitude": self.latitude,
                    "longitude": self.longitude,
                    "current": "us_aqi,pm2_5",
                },
            )
            response.raise_for_status()
            data = response.json()
        current = data.get("current", {})
        return {"usAqi": current.get("us_aqi"), "pm25": current.get("pm2_5")}


provider = AirQualityProvider()


def aqi_category(us_aqi: float | None) -> str:
    if us_aqi is None:
        return "Unknown"
    if us_aqi <= 50:
        return "Good"
    if us_aqi <= 100:
        return "Moderate"
    if us_aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if us_aqi <= 200:
        return "Unhealthy"
    if us_aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"
