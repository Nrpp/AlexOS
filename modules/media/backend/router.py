from __future__ import annotations

from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import NoActiveDeviceError, SpotifyAuthExpiredError, next_track, now_playing, pause, play, previous_track

router = APIRouter()


class PlaybackRequest(BaseModel):
    action: Literal["play", "pause", "next", "previous"]


_ACTIONS = {"play": play, "pause": pause, "next": next_track, "previous": previous_track}


@router.get("/now-playing")
async def get_now_playing() -> dict:
    try:
        return await now_playing()
    except SpotifyAuthExpiredError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Spotify.") from error


@router.post("/playback")
async def post_playback(body: PlaybackRequest, request: Request) -> dict:
    try:
        await _ACTIONS[body.action]()
        payload = await now_playing()
    except SpotifyAuthExpiredError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    except NoActiveDeviceError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Spotify.") from error

    await request.app.state.event_bus.publish("media.updated", payload, source="media", retain=True)
    return payload
