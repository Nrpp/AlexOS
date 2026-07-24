from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

_API_URL = "https://zenquotes.io/api/random"


@router.get("/quote")
async def get_quote() -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(_API_URL)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach ZenQuotes.") from error
    entry = data[0] if data else {}
    return {"quote": entry.get("q", ""), "author": entry.get("a", "Unknown")}
