"""A tiny in-memory sliding-window limiter for the internet-facing
`/webhook` endpoint. Deliberately simple, per the module's brief - this
is defense-in-depth on top of the per-device token (the real defense),
not a replacement for it. Not persisted (resets on a restart) and not
shared across multiple API processes; good enough for a single-instance
Raspberry Pi deployment.
"""

from __future__ import annotations

import logging
import time

logger = logging.getLogger("alexos.presence")

_WINDOW_SECONDS = 300.0
_MAX_FAILURES_PER_WINDOW = 10

# Keyed by client identity (IP address) - never by device_id or token,
# so this stays useful even against an attacker guessing device_ids too.
_failures: dict[str, list[float]] = {}


def _recent(identity: str, now: float) -> list[float]:
    return [attempt for attempt in _failures.get(identity, []) if now - attempt < _WINDOW_SECONDS]


def record_failure(identity: str, *, device_id: str | None) -> None:
    """Logs every bad/missing-token attempt - never the token itself -
    and tracks it for is_rate_limited()."""
    now = time.monotonic()
    attempts = _recent(identity, now)
    attempts.append(now)
    _failures[identity] = attempts
    logger.warning(
        "presence webhook: rejected request from %s (device_id=%r) - %d failed attempt(s) in the last %ds",
        identity,
        device_id,
        len(attempts),
        int(_WINDOW_SECONDS),
    )


def is_rate_limited(identity: str) -> bool:
    now = time.monotonic()
    attempts = _recent(identity, now)
    _failures[identity] = attempts
    return len(attempts) >= _MAX_FAILURES_PER_WINDOW


def reset(identity: str) -> None:
    """A successful call clears this identity's failure history - a
    typo'd token that's then fixed shouldn't stay throttled."""
    _failures.pop(identity, None)
