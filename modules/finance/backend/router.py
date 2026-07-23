from __future__ import annotations

from fastapi import APIRouter

from .state import summary

router = APIRouter()


@router.get("/expenses")
async def get_expenses() -> dict:
    return summary()
