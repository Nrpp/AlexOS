"""Real Gmail integration via the Gmail API. Shares the Google OAuth
client with modules/calendar and modules/tasks - see
apps/api/app/core/google_auth.py and the module README."""

from __future__ import annotations

import asyncio
import base64
import html
import re
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


@dataclass
class FullMessage:
    id: str
    sender: str
    subject: str
    date: str
    body: str


def full_message_to_payload(message: FullMessage) -> dict[str, Any]:
    return {
        "id": message.id,
        "sender": message.sender,
        "subject": message.subject,
        "date": message.date,
        "body": message.body,
    }


def _header(headers: list[dict[str, str]], name: str) -> str:
    return next((header["value"] for header in headers if header["name"] == name), "")


def _decode_body_data(data: str) -> str:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace")


def _strip_html(raw_html: str) -> str:
    """Renders an HTML email body as readable plain text rather than
    injecting raw HTML into the frontend - avoids needing an HTML
    sanitizer dependency just to safely display someone else's markup."""
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", raw_html, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _find_body_part(part: dict[str, Any]) -> tuple[str, str] | None:
    """Walks a (possibly multipart) Gmail message payload for the best
    body part available, preferring text/plain over text/html."""
    mime_type = part.get("mimeType", "")
    body_data = part.get("body", {}).get("data")
    if mime_type == "text/plain" and body_data:
        return ("text/plain", _decode_body_data(body_data))
    if mime_type == "text/html" and body_data:
        return ("text/html", _decode_body_data(body_data))

    best: tuple[str, str] | None = None
    for subpart in part.get("parts", []):
        found = _find_body_part(subpart)
        if found is None:
            continue
        if found[0] == "text/plain":
            return found
        best = best or found
    return best


def extract_body_text(payload: dict[str, Any]) -> str:
    found = _find_body_part(payload)
    if found is None:
        return ""
    mime_type, text = found
    return _strip_html(text) if mime_type == "text/html" else text


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


async def fetch_full_message(message_id: str) -> FullMessage | None:
    """None means Gmail isn't configured - distinct from a missing message."""
    access_token = await google_auth.get_access_token()
    if access_token is None:
        return None

    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{_API_BASE}/messages/{message_id}", headers=headers, params={"format": "full"}
        )
        response.raise_for_status()
        data = response.json()

    payload = data.get("payload", {})
    message_headers = payload.get("headers", [])
    return FullMessage(
        id=data["id"],
        sender=_header(message_headers, "From"),
        subject=_header(message_headers, "Subject"),
        date=_header(message_headers, "Date"),
        body=extract_body_text(payload),
    )


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
