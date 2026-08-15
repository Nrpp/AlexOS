from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Request

from .state import client

router = APIRouter()


@router.get("/status")
async def get_status() -> dict:
    if not client.is_configured:
        return {"configured": False, "reachable": False}
    try:
        health = await client.fetch_status()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Alex.") from error
    return {"configured": True, "reachable": True, **health}


@router.get("/reminders")
async def get_reminders() -> dict:
    if not client.is_configured:
        return {"configured": False, "reminders": []}
    try:
        reminders = await client.fetch_reminders()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Alex.") from error
    return {"configured": True, "reminders": reminders}


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, request: Request) -> dict:
    if not client.is_configured:
        raise HTTPException(status_code=404, detail="Alex isn't configured.")
    try:
        ok = await client.cancel_reminder(reminder_id)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Alex.") from error
    await request.app.state.event_bus.publish("alex_assistant.reminders_changed", {}, source="alex_assistant")
    return {"success": ok}
