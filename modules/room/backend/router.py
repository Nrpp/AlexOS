from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import apply_scene, light_to_payload, list_lights, set_light

router = APIRouter()


class UpdateLightRequest(BaseModel):
    on: bool | None = None
    brightness: int | None = None


@router.get("/lights")
async def get_lights() -> list[dict]:
    return [light_to_payload(light) for light in list_lights()]


@router.patch("/lights/{light_id}")
async def patch_light(light_id: str, body: UpdateLightRequest, request: Request) -> dict:
    light = set_light(light_id, on=body.on, brightness=body.brightness)
    if light is None:
        raise HTTPException(status_code=404, detail="Light not found")
    payload = light_to_payload(light)
    await request.app.state.event_bus.publish("room.updated", {"lights": [payload]}, source="room")
    return payload


@router.post("/scenes/{scene_name}")
async def post_scene(scene_name: str, request: Request) -> list[dict]:
    lights = apply_scene(scene_name)
    if lights is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    payload = [light_to_payload(light) for light in lights]
    await request.app.state.event_bus.publish("room.updated", {"lights": payload}, source="room")
    return payload
