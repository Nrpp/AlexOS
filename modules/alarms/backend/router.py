from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import InvalidTimeError, create_alarm, delete_alarm, list_alarms, set_enabled

router = APIRouter()


class CreateAlarmRequest(BaseModel):
    label: str
    time: str  # "HH:MM", 24h


class UpdateAlarmRequest(BaseModel):
    enabled: bool


@router.get("/alarms")
async def get_alarms(request: Request) -> list[dict]:
    return await list_alarms(request.app.state.storage_manager)


@router.post("/alarms", status_code=201)
async def post_alarm(body: CreateAlarmRequest, request: Request) -> dict:
    try:
        return await create_alarm(request.app.state.storage_manager, body.label, body.time)
    except InvalidTimeError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.patch("/alarms/{alarm_id}")
async def patch_alarm(alarm_id: str, body: UpdateAlarmRequest, request: Request) -> dict:
    alarm = await set_enabled(request.app.state.storage_manager, alarm_id, body.enabled)
    if alarm is None:
        raise HTTPException(status_code=404, detail="Alarm not found.")
    return alarm


@router.delete("/alarms/{alarm_id}", status_code=204, response_model=None)
async def remove_alarm(alarm_id: str, request: Request) -> None:
    deleted = await delete_alarm(request.app.state.storage_manager, alarm_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Alarm not found.")
