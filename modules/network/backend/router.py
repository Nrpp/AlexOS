from __future__ import annotations

from fastapi import APIRouter

from .state import provider, stats_to_payload

router = APIRouter()


@router.get("/status")
async def get_status() -> dict:
    return stats_to_payload(provider.read())
