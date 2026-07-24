from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

_API_URL = "https://official-joke-api.appspot.com/random_joke"


@router.get("/joke")
async def get_joke() -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(_API_URL)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach the joke service.") from error
    return {"setup": data.get("setup", ""), "punchline": data.get("punchline", "")}
