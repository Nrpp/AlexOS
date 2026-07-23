from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import client, light_to_payload

router = APIRouter()


class UpdateLightRequest(BaseModel):
    on: bool | None = None
    brightness: int | None = None


@router.get("/lights")
async def get_lights() -> dict:
    try:
        lights = await client.list_lights()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Home Assistant.") from error
    return {"configured": client.is_configured, "lights": [light_to_payload(light) for light in lights]}


@router.patch("/lights/{entity_id}")
async def patch_light(entity_id: str, body: UpdateLightRequest, request: Request) -> dict:
    try:
        light = await client.set_light(entity_id, on=body.on, brightness=body.brightness)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Home Assistant.") from error
    if light is None:
        raise HTTPException(status_code=404, detail="Home Assistant isn't configured, or the light wasn't found.")
    payload = light_to_payload(light)
    await request.app.state.event_bus.publish("room.updated", {"lights": [payload]}, source="room")
    return payload


@router.post("/scenes/{scene_name}")
async def post_scene(scene_name: str, request: Request) -> list[dict]:
    try:
        lights = await client.apply_scene(scene_name)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Home Assistant.") from error
    if lights is None:
        raise HTTPException(status_code=404, detail="Scene not found, or Home Assistant isn't configured.")
    payload = [light_to_payload(light) for light in lights]
    await request.app.state.event_bus.publish("room.updated", {"lights": payload}, source="room")
    return payload
