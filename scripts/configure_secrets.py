#!/usr/bin/env python3
"""Run this ON THE RASPBERRY PI (over SSH is fine) to write secrets into
its .env file. Values are typed directly into your terminal and go
straight into .env on disk - they are never printed back out, never
sent anywhere else, and .env is already in .gitignore so they can't
end up on GitHub through a careless `git add -A`.

Safe to re-run: existing values are shown as "(already set, Enter to
keep)" and left untouched unless you type a new one.

Uses only the Python standard library - no pip install needed.

Usage:
    python scripts/configure_secrets.py
"""

from __future__ import annotations

import getpass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = REPO_ROOT / ".env"
ENV_EXAMPLE_PATH = REPO_ROOT / ".env.example"

# (key, prompt, is_secret)
SECRET_FIELDS = [
    ("HA_BASE_URL", "Home Assistant base URL (e.g. http://homeassistant.local:8123)", False),
    ("HA_ACCESS_TOKEN", "Home Assistant long-lived access token", True),
    ("GOOGLE_CLIENT_ID", "Google OAuth client ID", False),
    ("GOOGLE_CLIENT_SECRET", "Google OAuth client secret", True),
    ("GOOGLE_REFRESH_TOKEN", "Google OAuth refresh token", True),
]


def _read_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        values[key.strip()] = value.strip()
    return values


def _prompt_for(key: str, label: str, is_secret: bool, current: dict[str, str]) -> str | None:
    existing = current.get(key, "")
    suffix = " (already set, Enter to keep)" if existing else " (Enter to skip)"
    reader = getpass.getpass if is_secret else input
    entered = reader(f"{label}{suffix}: ")
    return entered.strip() if entered.strip() else None


def main() -> None:
    current = _read_env(ENV_PATH)
    base = _read_env(ENV_EXAMPLE_PATH) if not current else {}

    merged = {**base, **current}

    print("AlexOS secrets setup - values are written straight to .env, never")
    print("echoed back or sent anywhere. Leave blank to keep the current value.\n")

    for key, label, is_secret in SECRET_FIELDS:
        new_value = _prompt_for(key, label, is_secret, merged)
        if new_value is not None:
            merged[key] = new_value

    lines = []
    if ENV_EXAMPLE_PATH.exists():
        seen: set[str] = set()
        for line in ENV_EXAMPLE_PATH.read_text().splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and "=" in stripped:
                key = stripped.partition("=")[0].strip()
                lines.append(f"{key}={merged.get(key, '')}")
                seen.add(key)
            else:
                lines.append(line)
        for key, value in merged.items():
            if key not in seen:
                lines.append(f"{key}={value}")
    else:
        lines = [f"{key}={value}" for key, value in merged.items()]

    ENV_PATH.write_text("\n".join(lines) + "\n")
    print(f"\nWrote {ENV_PATH}. Restart the API service for changes to take effect:")
    print("  docker compose -f docker/docker-compose.yml up -d --build api")


if __name__ == "__main__":
    main()
