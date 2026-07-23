"""Real Home Assistant client. Reads HA_BASE_URL and HA_ACCESS_TOKEN
from the process environment (never config.json - those are secrets,
config.json is committed to git). See the module README for how to
generate a token."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import httpx

# App-side scene presets, applied by calling each configured light's
# service directly - doesn't require the user to have pre-defined HA
# scene entities of the same name.
SCENES: dict[str, dict[str, Any]] = {
    "focus": {"on": True, "brightness_pct": 100},
    "sleep": {"on": False, "brightness_pct": 10},
    "morning": {"on": True, "brightness_pct": 60},
}


@dataclass
class Light:
    entity_id: str
    name: str
    on: bool
    brightness: int


def light_to_payload(light: Light) -> dict[str, Any]:
    return {"id": light.entity_id, "name": light.name, "on": light.on, "brightness": light.brightness}


class HomeAssistantClient:
    def __init__(self) -> None:
        self.base_url = os.environ.get("HA_BASE_URL", "").rstrip("/")
        self.access_token = os.environ.get("HA_ACCESS_TOKEN", "")
        self.light_entity_ids: list[str] = []

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.access_token)

    def configure(self, config: dict[str, Any]) -> None:
        self.light_entity_ids = config.get("lightEntityIds", [])

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}", "Content-Type": "application/json"}

    async def list_lights(self) -> list[Light]:
        if not self.is_configured or not self.light_entity_ids:
            return []
        lights: list[Light] = []
        async with httpx.AsyncClient(timeout=10.0) as client:
            for entity_id in self.light_entity_ids:
                response = await client.get(f"{self.base_url}/api/states/{entity_id}", headers=self._headers())
                response.raise_for_status()
                state = response.json()
                attributes = state.get("attributes", {})
                brightness_255 = attributes.get("brightness") or 0
                lights.append(
                    Light(
                        entity_id=entity_id,
                        name=attributes.get("friendly_name", entity_id),
                        on=state.get("state") == "on",
                        brightness=round((brightness_255 / 255) * 100),
                    )
                )
        return lights

    async def set_light(self, entity_id: str, on: bool | None, brightness: int | None) -> Light | None:
        if not self.is_configured:
            return None
        service = "turn_off" if on is False else "turn_on"
        payload: dict[str, Any] = {"entity_id": entity_id}
        if service == "turn_on" and brightness is not None:
            payload["brightness_pct"] = brightness
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{self.base_url}/api/services/light/{service}", headers=self._headers(), json=payload
            )
            response.raise_for_status()
        lights = await self.list_lights()
        return next((light for light in lights if light.entity_id == entity_id), None)

    async def apply_scene(self, scene_name: str) -> list[Light] | None:
        preset = SCENES.get(scene_name)
        if preset is None or not self.is_configured:
            return None
        async with httpx.AsyncClient(timeout=10.0) as client:
            for entity_id in self.light_entity_ids:
                service = "turn_on" if preset["on"] else "turn_off"
                payload: dict[str, Any] = {"entity_id": entity_id}
                if preset["on"]:
                    payload["brightness_pct"] = preset["brightness_pct"]
                response = await client.post(
                    f"{self.base_url}/api/services/light/{service}", headers=self._headers(), json=payload
                )
                response.raise_for_status()
        return await self.list_lights()


client = HomeAssistantClient()
