from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

_API_URL = "https://api.datamuse.com/words"


@router.get("/synonyms")
async def get_synonyms(word: str = Query(min_length=1)) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(_API_URL, params={"ml": word, "max": 12})
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach the thesaurus service.") from error
    return {"word": word, "synonyms": [entry["word"] for entry in data]}
