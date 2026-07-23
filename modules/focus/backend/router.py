from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel

from .state import fire_webhooks, manager, session_to_payload

router = APIRouter()


class StartFocusRequest(BaseModel):
    durationMinutes: int | None = None


@router.get("/status")
async def get_status() -> dict:
    return session_to_payload(manager.session)


@router.post("/start")
async def post_start(body: StartFocusRequest, request: Request) -> dict:
    session = manager.start(body.durationMinutes)
    payload = session_to_payload(session)
    await request.app.state.event_bus.publish("focus.started", payload, source="focus", retain=True)
    await fire_webhooks("started", payload, manager.webhook_timeout_seconds)
    return payload


@router.post("/stop")
async def post_stop(request: Request) -> dict:
    session = manager.stop()
    payload = session_to_payload(session)
    await request.app.state.event_bus.publish("focus.ended", payload, source="focus", retain=True)
    await fire_webhooks("ended", payload, manager.webhook_timeout_seconds)
    return payload
