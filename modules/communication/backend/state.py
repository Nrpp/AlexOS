"""In-memory mock inbox. See the module README for what a real Gmail
connection would replace here."""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

_SENDERS_AND_SUBJECTS = [
    ("GitHub", "Your build passed", "All checks succeeded on main."),
    ("Amazon", "Your order has shipped", "Arriving Thursday between 2-6pm."),
    ("Bank Alert", "Your statement is ready", "View your latest statement online."),
    ("Newsletter", "This week's picks", "Five things worth your time this week."),
    ("Nicolás", "Quick question", "Did you get a chance to look at this?"),
]


@dataclass
class Message:
    id: str
    sender: str
    subject: str
    snippet: str
    unread: bool
    received_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def message_to_payload(message: Message) -> dict[str, Any]:
    return {
        "id": message.id,
        "sender": message.sender,
        "subject": message.subject,
        "snippet": message.snippet,
        "unread": message.unread,
        "receivedAt": message.received_at.isoformat(),
    }


_messages: dict[str, Message] = {}


def _seed() -> None:
    for sender, subject, snippet in _SENDERS_AND_SUBJECTS[:3]:
        message = Message(id=str(uuid.uuid4()), sender=sender, subject=subject, snippet=snippet, unread=True)
        _messages[message.id] = message


_seed()


def list_messages() -> list[Message]:
    return sorted(_messages.values(), key=lambda message: message.received_at, reverse=True)


def mark_read(message_id: str) -> Message | None:
    message = _messages.get(message_id)
    if message is None:
        return None
    message.unread = False
    return message


def simulate_new_message() -> Message:
    sender, subject, snippet = random.choice(_SENDERS_AND_SUBJECTS)
    message = Message(id=str(uuid.uuid4()), sender=sender, subject=subject, snippet=snippet, unread=True)
    _messages[message.id] = message
    return message
