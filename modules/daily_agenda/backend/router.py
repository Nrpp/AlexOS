from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import create_entry, delete_entry, list_entries_for_date

router = APIRouter()


class CreateEntryRequest(BaseModel):
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    text: str


@router.get("/entries")
async def get_entries(date: str, request: Request) -> list[dict]:
    return await list_entries_for_date(request.app.state.storage_manager, date)


@router.post("/entries", status_code=201)
async def post_entry(body: CreateEntryRequest, request: Request) -> dict:
    return await create_entry(request.app.state.storage_manager, body.date, body.time, body.text)


@router.delete("/entries/{entry_id}", status_code=204, response_model=None)
async def remove_entry(entry_id: str, request: Request) -> None:
    deleted = await delete_entry(request.app.state.storage_manager, entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found.")
