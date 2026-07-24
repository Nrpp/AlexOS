from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import check_in, create_habit, delete_habit, list_habits

router = APIRouter()


class CreateHabitRequest(BaseModel):
    name: str


@router.get("/habits")
async def get_habits(request: Request) -> list[dict]:
    return await list_habits(request.app.state.storage_manager)


@router.post("/habits", status_code=201)
async def post_habit(body: CreateHabitRequest, request: Request) -> dict:
    return await create_habit(request.app.state.storage_manager, body.name)


@router.post("/habits/{habit_id}/check")
async def post_check_in(habit_id: str, request: Request) -> dict:
    habit = await check_in(request.app.state.storage_manager, habit_id)
    if habit is None:
        raise HTTPException(status_code=404, detail="Habit not found.")
    return habit


@router.delete("/habits/{habit_id}", status_code=204, response_model=None)
async def remove_habit(habit_id: str, request: Request) -> None:
    deleted = await delete_habit(request.app.state.storage_manager, habit_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Habit not found.")
