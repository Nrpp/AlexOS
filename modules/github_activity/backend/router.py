from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from .state import provider

router = APIRouter()


@router.get("/activity")
async def get_activity() -> dict:
    try:
        events = await provider.list_recent_events()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach GitHub.") from error
    if events is None:
        return {"configured": False, "username": provider.username, "events": []}
    return {"configured": True, "username": provider.username, "events": events}
