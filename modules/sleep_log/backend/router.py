from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import delete_entry, list_entries, log_entry

router = APIRouter()


class LogEntryRequest(BaseModel):
    date: str  # YYYY-MM-DD
    hours: float
    note: str = ""


@router.get("/entries")
async def get_entries(request: Request) -> list[dict]:
    return await list_entries(request.app.state.storage_manager)


@router.post("/entries", status_code=201)
async def post_entry(body: LogEntryRequest, request: Request) -> dict:
    return await log_entry(request.app.state.storage_manager, body.date, body.hours, body.note)


@router.delete("/entries/{entry_id}", status_code=204, response_model=None)
async def remove_entry(entry_id: str, request: Request) -> None:
    deleted = await delete_entry(request.app.state.storage_manager, entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found.")
