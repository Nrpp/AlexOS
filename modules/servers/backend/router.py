from __future__ import annotations

from fastapi import APIRouter

from .state import provider, stats_to_payload

router = APIRouter()


@router.get("/stats")
async def get_stats() -> dict:
    return stats_to_payload(provider.read())
