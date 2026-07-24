from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from .state import provider

router = APIRouter()


@router.get("/headlines")
async def get_headlines() -> dict:
    try:
        headlines = await provider.list_headlines()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach the configured feed.") from error
    if headlines is None:
        return {"configured": False, "headlines": []}
    return {"configured": True, "headlines": headlines}
