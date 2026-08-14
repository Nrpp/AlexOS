from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en"


@router.get("/lookup")
async def get_lookup(word: str = Query(min_length=1)) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{_API_URL}/{word}")
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach the dictionary service.") from error

    if response.status_code == 404:
        return {"found": False, "word": word, "phonetic": None, "meanings": []}
    response.raise_for_status()
    entries = response.json()
    entry = entries[0] if entries else {}

    meanings = [
        {
            "partOfSpeech": meaning.get("partOfSpeech", ""),
            "definition": (meaning.get("definitions") or [{}])[0].get("definition", ""),
            "example": (meaning.get("definitions") or [{}])[0].get("example"),
        }
        for meaning in entry.get("meanings", [])
    ]
    return {"found": True, "word": entry.get("word", word), "phonetic": entry.get("phonetic"), "meanings": meanings}
