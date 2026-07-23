from __future__ import annotations

from fastapi import APIRouter

from .state import events

router = APIRouter()


@router.get("/events/today")
async def get_today_events() -> list[dict]:
    return events
