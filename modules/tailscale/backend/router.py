from __future__ import annotations

from fastapi import APIRouter

from .state import get_status

router = APIRouter()


@router.get("/status")
async def get_status_route() -> dict:
    status = await get_status()
    if status is None:
        return {"available": False, "backendState": None, "self": None, "peers": []}
    return {"available": True, **status}
