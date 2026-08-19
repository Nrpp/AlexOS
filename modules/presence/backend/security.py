"""Cryptography for the presence module: per-device webhook tokens and
the away-mode PIN. Every secret comparison goes through
`hmac.compare_digest`, never `==` - a plain string comparison
short-circuits on the first mismatched byte, which leaks timing
information an attacker can use to guess a secret one byte at a time.

Device tokens are generated with `secrets.token_urlsafe` (a CSPRNG, not
`random`) and kept retrievable in storage rather than hashed: the
Settings UI needs to redisplay a device's full webhook URL on demand
(the owner may need to reconfigure Shortcuts/Tasker weeks later), and
`hmac.compare_digest` already makes the comparison itself constant-time
regardless of whether the stored value is a hash or the raw secret. The
PIN is different - it's short and human-guessable, so it's hashed with
PBKDF2-HMAC (stdlib only, no new dependency) and never stored or
returned in the clear.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from typing import Any

_PBKDF2_ITERATIONS = 390_000
_SALT_BYTES = 16


def generate_device_token() -> str:
    """A long random per-device secret, handed out once at registration
    time and required on every /webhook call from outside the LAN."""
    return secrets.token_urlsafe(32)


def generate_device_id(name: str) -> str:
    """A short, URL-safe slug plus a random suffix, so two devices with
    the same friendly name ("Phone") never collide."""
    slug_chars = "".join(ch.lower() if ch.isalnum() else "-" for ch in name)
    slug = "-".join(part for part in slug_chars.split("-") if part) or "device"
    return f"{slug}-{secrets.token_hex(3)}"


def hash_pin(pin: str) -> dict[str, str]:
    """Returns a storable record - never the plaintext PIN."""
    salt = secrets.token_bytes(_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return {"hash": digest.hex(), "salt": salt.hex(), "iterations": str(_PBKDF2_ITERATIONS)}


def verify_pin(pin: str, stored: dict[str, Any]) -> bool:
    try:
        salt = bytes.fromhex(stored["salt"])
        iterations = int(stored.get("iterations", _PBKDF2_ITERATIONS))
        expected = stored["hash"]
    except (KeyError, ValueError):
        return False
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(digest.hex(), expected)


def tokens_match(candidate: str, stored: str) -> bool:
    return hmac.compare_digest(candidate, stored)
