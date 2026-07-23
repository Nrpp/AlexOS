from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from .state import event_to_payload, list_today_events

router = APIRouter()


@router.get("/events/today")
async def get_today_events() -> dict:
    try:
        events = await list_today_events()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Google Calendar.") from error
    if events is None:
        return {"configured": False, "events": []}
    return {"configured": True, "events": [event_to_payload(event) for event in events]}
