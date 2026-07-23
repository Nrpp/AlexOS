from __future__ import annotations

from fastapi import APIRouter

from .state import provider, reading_to_payload

router = APIRouter()


@router.get("/current")
async def get_current() -> dict:
    return reading_to_payload(provider.read())
