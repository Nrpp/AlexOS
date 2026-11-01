"""HTTP surface for voice_dj, mounted at /api/v1/modules/voice_dj.

Two audiences:
  * the HOST agent (agent/listen.py) - posts its status and the intents
    it recognises, and polls for manual commands from the UI;
  * the widget - reads state and enqueues manual play/stop commands.

Every change republishes the full public state on the Core Event Bus as
`voice_dj.state`, so the widget updates live without polling. A
recognised voice intent is additionally published as `voice_dj.intent`,
the Core-level signal the task asks for - any other module could
subscribe to it, and it's how "pon musica" becomes a first-class AlexOS
event rather than something that only ever happens inside the agent."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel

from .state import state

router = APIRouter()


class HeartbeatRequest(BaseModel):
    mode: str | None = None
    source: str | None = None
    speakerConnected: bool | None = None
    lastHeard: str | None = None
    nowPlaying: str | None = None
    detail: str | None = None


class IntentRequest(BaseModel):
    intent: str  # e.g. "play_music", "stop"
    text: str = ""  # the raw transcript that produced it


class CommandRequest(BaseModel):
    action: Literal["play", "stop"]
    source: Literal["spotify", "radio"] | None = None


async def _publish_state(request: Request) -> dict:
    payload = state.to_payload()
    await request.app.state.event_bus.publish("voice_dj.state", payload, source="voice_dj", retain=True)
    return payload


@router.get("/state")
async def get_state() -> dict:
    return state.to_payload()


@router.post("/heartbeat")
async def post_heartbeat(body: HeartbeatRequest, request: Request) -> dict:
    """The agent calls this every few seconds with its current status."""
    state.update_from_agent(body.model_dump(exclude_none=True))
    return await _publish_state(request)


@router.post("/intent")
async def post_intent(body: IntentRequest, request: Request) -> dict:
    """The agent calls this when it recognises a spoken command. We
    publish it on the Core Event Bus (`voice_dj.intent`) and mirror the
    transcript into state. The agent itself performs the playback on the
    host - this endpoint is the AlexOS-level record of what was heard."""
    if body.text:
        state.last_heard = body.text
    await request.app.state.event_bus.publish(
        "voice_dj.intent", {"intent": body.intent, "text": body.text}, source="voice_dj"
    )
    return await _publish_state(request)


@router.get("/commands")
async def get_commands() -> dict:
    """The agent polls this; each queued command is returned once."""
    return {"commands": state.drain_commands()}


@router.post("/play")
async def post_play(request: Request, body: CommandRequest | None = None) -> dict:
    """Widget "Pon musica" button - enqueue a command for the agent."""
    source = body.source if body else None
    state.enqueue_command("play", source)
    return await _publish_state(request)


@router.post("/stop")
async def post_stop(request: Request) -> dict:
    state.enqueue_command("stop")
    return await _publish_state(request)
