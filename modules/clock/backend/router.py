from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/time")
async def get_time() -> dict:
    return {"iso": datetime.now(timezone.utc).isoformat()}
