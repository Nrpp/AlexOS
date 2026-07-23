from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .state import list_messages, mark_read, message_to_payload

router = APIRouter()


@router.get("/messages")
async def get_messages() -> list[dict]:
    return [message_to_payload(message) for message in list_messages()]


@router.patch("/messages/{message_id}")
async def patch_message(message_id: str) -> dict:
    message = mark_read(message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return message_to_payload(message)
