from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel

from .state import list_messages, message_to_payload, send_message

router = APIRouter()


class SendMessageRequest(BaseModel):
    text: str


@router.get("/messages")
async def get_messages() -> list[dict]:
    return [message_to_payload(message) for message in list_messages()]


@router.post("/messages")
async def post_message(body: SendMessageRequest, request: Request) -> dict:
    reply = send_message(body.text)
    payload = message_to_payload(reply)
    await request.app.state.event_bus.publish("ai.reply", payload, source="ai")
    return payload
