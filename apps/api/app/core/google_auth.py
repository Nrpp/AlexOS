"""Shared Google OAuth2 token refresh, used by any module that talks to
a Google API (Gmail, Calendar, Tasks, ...). One refresh token - minted
once via scripts/google_oauth_setup.py - is exchanged for short-lived
access tokens on demand, so no module reimplements this.

GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN come
from the environment, never config.json - see docs/MODULES.md's
secrets-vs-config pattern.
"""

from __future__ import annotations

import os
import time

import httpx

_TOKEN_URL = "https://oauth2.googleapis.com/token"


class GoogleAuth:
    def __init__(self) -> None:
        self.client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
        self.client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
        self.refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN", "")
        self._access_token: str | None = None
        self._expires_at: float = 0.0

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.refresh_token)

    async def get_access_token(self) -> str | None:
        """Returns a valid access token, refreshing it first if it's
        missing or about to expire. None if Google isn't configured."""
        if not self.is_configured:
            return None
        if self._access_token and time.monotonic() < self._expires_at:
            return self._access_token

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                _TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": self.refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            data = response.json()

        self._access_token = data["access_token"]
        # Refresh a minute early rather than cutting it exactly at expiry.
        self._expires_at = time.monotonic() + data.get("expires_in", 3600) - 60
        return self._access_token


google_auth = GoogleAuth()
