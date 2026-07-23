from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from .state import provider, reading_to_payload

router = APIRouter()


@router.get("/current")
async def get_current() -> dict:
    try:
        reading = await provider.read()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="We couldn't reach the weather service.") from error
    return reading_to_payload(reading)
