from __future__ import annotations

from fastapi import APIRouter, Request

from .state import get_today, log_glass, reset_today, settings

router = APIRouter()


@router.get("/today")
async def get_today_route(request: Request) -> dict:
    today = await get_today(request.app.state.storage_manager)
    return {**today, "dailyGoal": settings.daily_goal}


@router.post("/log")
async def post_log(request: Request) -> dict:
    today = await log_glass(request.app.state.storage_manager)
    return {**today, "dailyGoal": settings.daily_goal}


@router.post("/reset")
async def post_reset(request: Request) -> dict:
    today = await reset_today(request.app.state.storage_manager)
    return {**today, "dailyGoal": settings.daily_goal}
