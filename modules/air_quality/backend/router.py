from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from .state import aqi_category, provider

router = APIRouter()


@router.get("/current")
async def get_current() -> dict:
    try:
        reading = await provider.read()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Open-Meteo.") from error
    return {**reading, "category": aqi_category(reading.get("usAqi"))}
