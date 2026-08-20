from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.google_auth import GoogleAuthExpiredError

from .state import CalendarConfigError, event_to_payload, list_month_events, list_today_events

router = APIRouter()


@router.get("/events/today")
async def get_today_events() -> dict:
    try:
        events = await list_today_events()
    except GoogleAuthExpiredError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Google Calendar.") from error
    except CalendarConfigError as error:
        # A real misconfiguration (e.g. invalid timezone), not "no OAuth
        # credentials yet" - a 422 so the frontend can show the actual
        # reason instead of the generic "not connected" message.
        raise HTTPException(status_code=422, detail=str(error)) from error
    if events is None:
        return {"configured": False, "events": []}
    return {"configured": True, "events": [event_to_payload(event) for event in events]}


@router.get("/events/month")
async def get_month_events(
    year: int = Query(..., ge=1, le=9999),
    month: int = Query(..., ge=1, le=12),
) -> dict:
    try:
        events = await list_month_events(year, month)
    except GoogleAuthExpiredError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Google Calendar.") from error
    except CalendarConfigError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if events is None:
        return {"configured": False, "events": []}
    return {"configured": True, "events": [event_to_payload(event) for event in events]}
