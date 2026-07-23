from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel

from .state import player, state_to_payload

router = APIRouter()


class PlaybackRequest(BaseModel):
    action: Literal["play", "pause", "next", "previous"]


_ACTIONS = {
    "play": player.play,
    "pause": player.pause,
    "next": player.next,
    "previous": player.previous,
}


@router.get("/now-playing")
async def get_now_playing() -> dict:
    return state_to_payload(player)


@router.post("/playback")
async def post_playback(body: PlaybackRequest, request: Request) -> dict:
    _ACTIONS[body.action]()
    payload = state_to_payload(player)
    await request.app.state.event_bus.publish("media.updated", payload, source="media", retain=True)
    return payload
