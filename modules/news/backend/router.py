from __future__ import annotations

from fastapi import APIRouter

from .state import fetch_headlines

router = APIRouter()


@router.get("/headlines")
async def get_headlines() -> dict:
    return {"headlines": await fetch_headlines()}
