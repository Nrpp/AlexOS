"""Scripted keyword-matched replies - explicitly not a real language
model. See the module README before mistaking this for AI."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

Role = Literal["user", "assistant"]


@dataclass
class ChatMessage:
    id: str
    role: Role
    text: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def message_to_payload(message: ChatMessage) -> dict[str, Any]:
    return {
        "id": message.id,
        "role": message.role,
        "text": message.text,
        "createdAt": message.created_at.isoformat(),
    }


_history: list[ChatMessage] = []
_rules: list[dict[str, Any]] = []
_fallback_reply = "I'm Alex, but I'm not a real assistant yet - just canned replies until a language model is wired up."


def configure(config: dict[str, Any]) -> None:
    global _rules, _fallback_reply
    _rules = config.get("rules", [])
    _fallback_reply = config.get("fallbackReply", _fallback_reply)


def list_messages() -> list[ChatMessage]:
    return list(_history)


def _generate_reply(text: str) -> str:
    lowered = text.lower()
    for rule in _rules:
        if any(keyword in lowered for keyword in rule.get("keywords", [])):
            return rule["reply"]
    return _fallback_reply


def send_message(text: str) -> ChatMessage:
    """Appends the user's message and a scripted reply to history, returning the reply."""
    _history.append(ChatMessage(id=str(uuid.uuid4()), role="user", text=text))
    reply = ChatMessage(id=str(uuid.uuid4()), role="assistant", text=_generate_reply(text))
    _history.append(reply)
    return reply
