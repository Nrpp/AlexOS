"""In-memory focus session + outbound webhook firing.

`FOCUS_WEBHOOK_URLS` (comma-separated) is read from the environment,
never `config.json` - these URLs typically embed a secret token (a
Pushcut webhook URL, a Tasker/Join webhook), so they're secrets like
`HA_ACCESS_TOKEN` in `modules/room`. See the module README for how to
get one for iPad (Pushcut) and Android (Tasker/Join).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx


def _webhook_urls() -> list[str]:
    raw = os.environ.get("FOCUS_WEBHOOK_URLS", "")
    return [url.strip() for url in raw.split(",") if url.strip()]


@dataclass
class FocusSession:
    active: bool = False
    ends_at: datetime | None = None


def session_to_payload(session: FocusSession) -> dict[str, Any]:
    return {"active": session.active, "endsAt": session.ends_at.isoformat() if session.ends_at else None}


class FocusManager:
    def __init__(self) -> None:
        self.session = FocusSession()
        self.default_duration_minutes = 60
        self.webhook_timeout_seconds: float = 5.0

    def configure(self, config: dict[str, Any]) -> None:
        self.default_duration_minutes = config.get("defaultDurationMinutes", 60)
        self.webhook_timeout_seconds = config.get("webhookTimeoutSeconds", 5.0)

    @property
    def is_expired(self) -> bool:
        return (
            self.session.active
            and self.session.ends_at is not None
            and datetime.now(timezone.utc) >= self.session.ends_at
        )

    def start(self, duration_minutes: int | None) -> FocusSession:
        minutes = duration_minutes if duration_minutes is not None else self.default_duration_minutes
        self.session = FocusSession(active=True, ends_at=datetime.now(timezone.utc) + timedelta(minutes=minutes))
        return self.session

    def stop(self) -> FocusSession:
        self.session = FocusSession(active=False, ends_at=None)
        return self.session


async def fire_webhooks(event: str, payload: dict[str, Any], timeout_seconds: float) -> None:
    """Best-effort - one unreachable device must never block the others
    or fail the request that triggered this."""
    urls = _webhook_urls()
    if not urls:
        return
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        for url in urls:
            try:
                await client.post(url, json={"event": event, **payload})
            except httpx.HTTPError:
                pass


manager = FocusManager()
