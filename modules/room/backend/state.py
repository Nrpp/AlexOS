"""In-memory lights. See the module README for what a real smart-home
connection would replace here."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

SCENES: dict[str, dict[str, Any]] = {
    "focus": {"on": True, "brightness": 100},
    "sleep": {"on": False, "brightness": 10},
    "morning": {"on": True, "brightness": 60},
}


@dataclass
class Light:
    id: str
    name: str
    on: bool
    brightness: int


def light_to_payload(light: Light) -> dict[str, Any]:
    return {"id": light.id, "name": light.name, "on": light.on, "brightness": light.brightness}


_lights: dict[str, Light] = {}


def configure(config: dict[str, Any]) -> None:
    for entry in config.get("lights", []):
        light = Light(
            id=entry["id"],
            name=entry["name"],
            on=entry.get("on", False),
            brightness=entry.get("brightness", 80),
        )
        _lights[light.id] = light


def list_lights() -> list[Light]:
    return list(_lights.values())


def set_light(light_id: str, on: bool | None = None, brightness: int | None = None) -> Light | None:
    light = _lights.get(light_id)
    if light is None:
        return None
    if on is not None:
        light.on = on
    if brightness is not None:
        light.brightness = brightness
    return light


def apply_scene(scene_name: str) -> list[Light] | None:
    preset = SCENES.get(scene_name)
    if preset is None:
        return None
    for light in _lights.values():
        light.on = preset["on"]
        light.brightness = preset["brightness"]
    return list(_lights.values())
