from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import create_countdown, delete_countdown, list_countdowns

router = APIRouter()


class CreateCountdownRequest(BaseModel):
    title: str
    targetIso: str


@router.get("/countdowns")
async def get_countdowns(request: Request) -> list[dict]:
    return await list_countdowns(request.app.state.storage_manager)


@router.post("/countdowns", status_code=201)
async def post_countdown(body: CreateCountdownRequest, request: Request) -> dict:
    return await create_countdown(request.app.state.storage_manager, body.title, body.targetIso)


@router.delete("/countdowns/{countdown_id}", status_code=204, response_model=None)
async def remove_countdown(countdown_id: str, request: Request) -> None:
    deleted = await delete_countdown(request.app.state.storage_manager, countdown_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Countdown not found.")
