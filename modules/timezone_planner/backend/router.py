from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import add_zone, convert_for_saved_zones, create_meeting, list_zones, remove_zone

router = APIRouter()


class AddZoneRequest(BaseModel):
    name: str  # IANA timezone name, e.g. "America/New_York"
    label: str = ""


class ConvertRequest(BaseModel):
    iso: str  # naive local datetime in the configured base timezone


class CreateMeetingRequest(BaseModel):
    title: str
    iso: str


@router.get("/zones")
async def get_zones(request: Request) -> list[dict]:
    return await list_zones(request.app.state.storage_manager)


@router.post("/zones", status_code=201)
async def post_zone(body: AddZoneRequest, request: Request) -> dict:
    return await add_zone(request.app.state.storage_manager, body.name, body.label)


@router.delete("/zones/{zone_id}", status_code=204, response_model=None)
async def remove_zone_route(zone_id: str, request: Request) -> None:
    deleted = await remove_zone(request.app.state.storage_manager, zone_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Zone not found.")


@router.post("/convert")
async def post_convert(body: ConvertRequest, request: Request) -> dict:
    try:
        return await convert_for_saved_zones(request.app.state.storage_manager, body.iso)
    except Exception as error:
        raise HTTPException(status_code=422, detail=f"Couldn't convert that time: {error}") from error


@router.post("/meeting")
async def post_meeting(body: CreateMeetingRequest) -> dict:
    created = await create_meeting(body.title, body.iso)
    return {"calendarEventCreated": created}
