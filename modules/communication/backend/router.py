from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from .state import list_recent_messages, mark_read, message_to_payload

router = APIRouter()


@router.get("/messages")
async def get_messages() -> dict:
    try:
        messages = await list_recent_messages()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Gmail.") from error
    if messages is None:
        return {"configured": False, "messages": []}
    return {"configured": True, "messages": [message_to_payload(message) for message in messages]}


@router.patch("/messages/{message_id}")
async def patch_message(message_id: str) -> dict:
    try:
        ok = await mark_read(message_id)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Gmail.") from error
    if not ok:
        raise HTTPException(status_code=404, detail="Gmail isn't configured.")
    return {"id": message_id, "unread": False}
