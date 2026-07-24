from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import create_note, delete_note, list_notes, update_note

router = APIRouter()


class CreateNoteRequest(BaseModel):
    title: str
    body: str = ""


class UpdateNoteRequest(BaseModel):
    title: str
    body: str = ""


async def _publish_update(request: Request) -> None:
    notes = await list_notes(request.app.state.storage_manager)
    await request.app.state.event_bus.publish("notes.updated", {"notes": notes}, source="notes", retain=True)


@router.get("/notes")
async def get_notes(request: Request) -> list[dict]:
    return await list_notes(request.app.state.storage_manager)


@router.post("/notes", status_code=201)
async def post_note(body: CreateNoteRequest, request: Request) -> dict:
    note = await create_note(request.app.state.storage_manager, body.title, body.body)
    await _publish_update(request)
    return note


@router.patch("/notes/{note_id}")
async def patch_note(note_id: str, body: UpdateNoteRequest, request: Request) -> dict:
    note = await update_note(request.app.state.storage_manager, note_id, body.title, body.body)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found.")
    await _publish_update(request)
    return note


@router.delete("/notes/{note_id}", status_code=204, response_model=None)
async def remove_note(note_id: str, request: Request) -> None:
    deleted = await delete_note(request.app.state.storage_manager, note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found.")
    await _publish_update(request)
