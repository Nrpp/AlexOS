"""Real Spotify integration - now-playing and playback control via the
Spotify Web API. See the module README (and scripts/spotify_oauth_setup.py)
for how to connect it. Spotify Premium is required for playback
*control* (play/pause/skip); reading what's currently playing works on
a Free account too.

SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET/SPOTIFY_REFRESH_TOKEN come from
the environment, never config.json - see docs/MODULES.md's secrets-vs-
config pattern. Auth logic lives here rather than in app.core (unlike
Google, which several modules share) since only this module needs it."""

from __future__ import annotations

import base64
import os
import time
from typing import Any

import httpx

_TOKEN_URL = "https://accounts.spotify.com/api/token"
_API_BASE = "https://api.spotify.com/v1/me/player"

_NOT_CONFIGURED_PAYLOAD: dict[str, Any] = {
    "configured": False, "title": "", "artist": "", "durationSeconds": 0, "positionSeconds": 0, "isPlaying": False,
}
_NOTHING_PLAYING_PAYLOAD: dict[str, Any] = {
    "configured": True, "title": "", "artist": "", "durationSeconds": 0, "positionSeconds": 0, "isPlaying": False,
}


class SpotifyAuthExpiredError(Exception):
    """Raised when Spotify rejects the refresh token itself
    (`invalid_grant`) - distinct from a network/API failure. Usually
    means access was revoked from the Spotify account's app list
    (https://www.spotify.com/account/apps/) - re-run
    scripts/spotify_oauth_setup.py for a fresh token."""


class NoActiveDeviceError(Exception):
    """Spotify has nothing to control - no device is currently playing/
    paused there. Distinct from "not configured" (no credentials) and
    from a real API failure, so the router can give an actionable
    message instead of a generic error."""


class SpotifyAuth:
    def __init__(self) -> None:
        self.client_id = os.environ.get("SPOTIFY_CLIENT_ID", "")
        self.client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET", "")
        self.refresh_token = os.environ.get("SPOTIFY_REFRESH_TOKEN", "")
        self._access_token: str | None = None
        self._expires_at: float = 0.0

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.refresh_token)

    async def get_access_token(self) -> str | None:
        """Returns a valid access token, refreshing it first if it's
        missing or about to expire. None if Spotify isn't configured."""
        if not self.is_configured:
            return None
        if self._access_token and time.monotonic() < self._expires_at:
            return self._access_token

        basic_auth = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                _TOKEN_URL,
                data={"grant_type": "refresh_token", "refresh_token": self.refresh_token},
                headers={"Authorization": f"Basic {basic_auth}"},
            )
            if response.status_code == 400 and "invalid_grant" in response.text:
                raise SpotifyAuthExpiredError(
                    "Spotify rejected the refresh token (invalid_grant) - it was revoked. "
                    "Re-run scripts/spotify_oauth_setup.py for a fresh one."
                )
            response.raise_for_status()
            data = response.json()

        self._access_token = data["access_token"]
        self._expires_at = time.monotonic() + data.get("expires_in", 3600) - 60
        return self._access_token


spotify_auth = SpotifyAuth()


def _track_payload(data: dict[str, Any]) -> dict[str, Any]:
    item = data.get("item") or {}
    artists = item.get("artists") or []
    return {
        "configured": True,
        "title": item.get("name", ""),
        "artist": ", ".join(artist.get("name", "") for artist in artists),
        "durationSeconds": round((item.get("duration_ms") or 0) / 1000),
        "positionSeconds": round((data.get("progress_ms") or 0) / 1000),
        "isPlaying": bool(data.get("is_playing")),
    }


async def now_playing() -> dict[str, Any]:
    access_token = await spotify_auth.get_access_token()
    if access_token is None:
        return _NOT_CONFIGURED_PAYLOAD

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{_API_BASE}/currently-playing", headers={"Authorization": f"Bearer {access_token}"}
        )
    if response.status_code == 204 or not response.content:
        return _NOTHING_PLAYING_PAYLOAD
    response.raise_for_status()
    return _track_payload(response.json())


async def _control(path: str, method: str) -> None:
    access_token = await spotify_auth.get_access_token()
    if access_token is None:
        return
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.request(
            method, f"{_API_BASE}/{path}", headers={"Authorization": f"Bearer {access_token}"}
        )
    if response.status_code == 404:
        raise NoActiveDeviceError("No active Spotify device - open Spotify somewhere and start playing once.")
    response.raise_for_status()


async def play() -> None:
    await _control("play", "PUT")


async def pause() -> None:
    await _control("pause", "PUT")


async def next_track() -> None:
    await _control("next", "POST")


async def previous_track() -> None:
    await _control("previous", "POST")
