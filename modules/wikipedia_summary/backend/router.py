from __future__ import annotations

from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

_API_URL = "https://en.wikipedia.org/api/rest_v1/page/summary"


@router.get("/summary")
async def get_summary(title: str = Query(min_length=1)) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{_API_URL}/{quote(title)}", headers={"User-Agent": "AlexOS"})
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Wikipedia.") from error

    if response.status_code == 404:
        return {"found": False, "title": title, "extract": None, "url": None}
    response.raise_for_status()
    data = response.json()
    return {
        "found": True,
        "title": data.get("title", title),
        "extract": data.get("extract", ""),
        "url": data.get("content_urls", {}).get("desktop", {}).get("page"),
    }
