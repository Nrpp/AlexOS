"""Real Gmail integration via the Gmail API. Shares the Google OAuth
client with modules/calendar and modules/tasks - see
apps/api/app/core/google_auth.py and the module README."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.google_auth import google_auth

_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"


@dataclass
class Message:
    id: str
    sender: str
    subject: str
    snippet: str
    unread: bool


def message_to_payload(message: Message) -> dict[str, Any]:
    return {
        "id": message.id,
        "sender": message.sender,
        "subject": message.subject,
        "snippet": message.snippet,
        "unread": message.unread,
    }


def _header(headers: list[dict[str, str]], name: str) -> str:
    return next((header["value"] for header in headers if header["name"] == name), "")


async def _fetch_message(client: httpx.AsyncClient, headers: dict[str, str], message_id: str) -> Message:
    response = await client.get(
        f"{_API_BASE}/messages/{message_id}",
        headers=headers,
        params={"format": "metadata", "metadataHeaders": ["From", "Subject"]},
    )
    response.raise_for_status()
    data = response.json()
    message_headers = data.get("payload", {}).get("headers", [])
    return Message(
        id=data["id"],
        sender=_header(message_headers, "From"),
        subject=_header(message_headers, "Subject"),
        snippet=data.get("snippet", ""),
        unread="UNREAD" in data.get("labelIds", []),
    )


async def list_recent_messages(max_results: int = 10) -> list[Message] | None:
    """None means Gmail isn't configured - distinct from an empty inbox."""
    access_token = await google_auth.get_access_token()
    if access_token is None:
        return None

    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        list_response = await client.get(
            f"{_API_BASE}/messages",
            headers=headers,
            params={"maxResults": max_results, "labelIds": "INBOX"},
        )
        list_response.raise_for_status()
        message_refs = list_response.json().get("messages", [])

        messages = await asyncio.gather(*(_fetch_message(client, headers, ref["id"]) for ref in message_refs))
    return list(messages)


async def mark_read(message_id: str) -> bool:
    access_token = await google_auth.get_access_token()
    if access_token is None:
        return False
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{_API_BASE}/messages/{message_id}/modify",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"removeLabelIds": ["UNREAD"]},
        )
        response.raise_for_status()
    return True


# Tracks message IDs already seen, so polling only publishes events for
# genuinely new mail rather than every message on every poll.
_seen_message_ids: set[str] = set()
_primed = False


async def poll_for_new_messages() -> list[Message]:
    global _primed
    messages = await list_recent_messages()
    if messages is None:
        return []

    if not _primed:
        # First poll after startup just establishes the baseline - it
        # would be wrong to announce every existing message as "new."
        _seen_message_ids.update(message.id for message in messages)
        _primed = True
        return []

    new_messages = [message for message in messages if message.id not in _seen_message_ids]
    _seen_message_ids.update(message.id for message in messages)
    return new_messages
