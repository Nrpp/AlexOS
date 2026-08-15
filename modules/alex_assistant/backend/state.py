"""Real client for Proyect-ALEX (the Alex personal assistant's own API,
running on its own Raspberry Pi). Reads ALEX_ASSISTANT_BASE_URL and
ALEX_ASSISTANT_API_TOKEN from the process environment (never config.json -
those are secrets, config.json is committed to git). See the module
README for how to find both values."""

from __future__ import annotations

import os
from typing import Any

import httpx

# Proyect-ALEX's notification priority is an integer 0-3 (see its
# clients/protocol.md: 0=info, 1=normal, 2=high, 3=critical). AlexOS's is
# one of four named levels, one of which ("success") is a positive-outcome
# concept Proyect-ALEX's scale doesn't have - guessing "success" from a
# notification's title/source would be fragile, so this is a
# straightforward severity mapping instead.
_PRIORITY_MAP: dict[int, str] = {
    0: "information",
    1: "information",
    2: "warning",
    3: "critical",
}


def map_priority(alex_priority: int) -> str:
    return _PRIORITY_MAP.get(alex_priority, "information")


class AlexAssistantClient:
    def __init__(self) -> None:
        self.base_url = os.environ.get("ALEX_ASSISTANT_BASE_URL", "").rstrip("/")
        self.api_token = os.environ.get("ALEX_ASSISTANT_API_TOKEN", "")
        self.status_poll_interval_seconds = 30.0
        self.reconnect_min_delay_seconds = 2.0
        self.reconnect_max_delay_seconds = 30.0

    @property
    def is_configured(self) -> bool:
        # The token is optional by design on Proyect-ALEX's own side too
        # (open/insecure mode for local-only dev, see its alex/server/auth.py) -
        # only the base URL is required to consider this module usable.
        return bool(self.base_url)

    @property
    def ws_url(self) -> str:
        ws_base = self.base_url.replace("https://", "wss://").replace("http://", "ws://")
        url = f"{ws_base}/ws?client_id=alexos"
        if self.api_token:
            url += f"&token={self.api_token}"
        return url

    def configure(self, config: dict[str, Any]) -> None:
        self.status_poll_interval_seconds = config.get("statusPollIntervalSeconds", 30.0)
        self.reconnect_min_delay_seconds = config.get("reconnectMinDelaySeconds", 2.0)
        self.reconnect_max_delay_seconds = config.get("reconnectMaxDelaySeconds", 30.0)

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_token}"} if self.api_token else {}

    async def fetch_status(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(f"{self.base_url}/health", headers=self._headers())
            response.raise_for_status()
            return response.json()

    async def fetch_reminders(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(f"{self.base_url}/reminders", headers=self._headers())
            response.raise_for_status()
            return response.json()

    async def cancel_reminder(self, reminder_id: str) -> bool:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.delete(
                f"{self.base_url}/reminders/{reminder_id}", headers=self._headers()
            )
            response.raise_for_status()
            return bool(response.json().get("success"))


client = AlexAssistantClient()
