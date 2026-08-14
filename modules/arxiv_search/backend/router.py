from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Query

from .state import parse_arxiv_feed

router = APIRouter()

_API_URL = "http://export.arxiv.org/api/query"


@router.get("/search")
async def get_search(query: str = Query(min_length=1), max_results: int = 5) -> dict:
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(
                _API_URL, params={"search_query": f"all:{query}", "max_results": max_results}
            )
            response.raise_for_status()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach arXiv.") from error
    return {"papers": parse_arxiv_feed(response.text)}
