"""NASA's Astronomy Picture of the Day. `NASA_API_KEY` is read from the
environment (never config.json - it's a credential, see the secrets-
vs-config pattern in docs/MODULES.md), but this module works with zero
setup using NASA's public `DEMO_KEY` (rate-limited to 30 requests/hour,
50/day - fine for a once-a-day widget)."""

from __future__ import annotations

import os

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

_API_URL = "https://api.nasa.gov/planetary/apod"


@router.get("/today")
async def get_today() -> dict:
    api_key = os.environ.get("NASA_API_KEY", "DEMO_KEY")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(_API_URL, params={"api_key": api_key})
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach NASA's APOD API.") from error
    return {
        "title": data.get("title", ""),
        "explanation": data.get("explanation", ""),
        "imageUrl": data.get("url", ""),
        "mediaType": data.get("media_type", "image"),
        "date": data.get("date", ""),
    }
