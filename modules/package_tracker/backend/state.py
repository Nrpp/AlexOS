"""Tracked packages - a manual list. Same generic module-data pattern
as modules/habit_tracker for the list itself (duplicated, not shared -
modules are independently loaded).

Saving a package with an estimated delivery date also tries to create
a real Google Calendar event for that date (app.core.google_calendar,
shared OAuth client with modules/calendar etc.)."""

from __future__ import annotations

import json
import uuid
from typing import Any
from urllib.parse import quote_plus

from app.core.google_calendar import create_event
from app.core.storage_manager import StorageManager

MODULE_NAME = "package_tracker"
_LIST_KEY = "packages"

_timezone = "UTC"


def configure(config: dict[str, Any]) -> None:
    global _timezone
    _timezone = config.get("timezone", _timezone)


def resolve_tracking_url(carrier: str, tracking_number: str, tracking_url: str) -> str:
    """Uses the user-supplied tracking URL (from their shipping
    confirmation email) if given - carrier tracking URL formats change
    often and aren't consistent enough to guess reliably, so a search
    link is the honest fallback rather than a hardcoded template that
    might just be wrong for that carrier."""
    if tracking_url:
        return tracking_url
    return f"https://www.google.com/search?q={quote_plus(f'{carrier} tracking {tracking_number}')}"


async def _all_packages(storage: StorageManager) -> list[dict[str, Any]]:
    raw = await storage.get_module_data(MODULE_NAME, _LIST_KEY)
    return json.loads(raw) if raw else []


async def _save(storage: StorageManager, packages: list[dict[str, Any]]) -> None:
    await storage.set_module_data(MODULE_NAME, _LIST_KEY, json.dumps(packages))


async def list_packages(storage: StorageManager) -> list[dict[str, Any]]:
    packages = await _all_packages(storage)
    return sorted(packages, key=lambda p: p.get("estimatedDeliveryDate") or "9999-99-99")


async def create_package(
    storage: StorageManager,
    label: str,
    carrier: str,
    tracking_number: str,
    tracking_url: str,
    estimated_delivery_date: str | None,
) -> dict[str, Any]:
    packages = await _all_packages(storage)
    resolved_url = resolve_tracking_url(carrier, tracking_number, tracking_url)
    package: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "label": label,
        "carrier": carrier,
        "trackingNumber": tracking_number,
        "trackingUrl": resolved_url,
        "estimatedDeliveryDate": estimated_delivery_date,
        "calendarEventCreated": False,
    }

    if estimated_delivery_date:
        event = await create_event(
            f"Package: {label}",
            f"{estimated_delivery_date}T09:00:00",
            f"{estimated_delivery_date}T10:00:00",
            _timezone,
            description=f"{carrier} - {tracking_number}\n{resolved_url}",
        )
        package["calendarEventCreated"] = event is not None

    packages.append(package)
    await _save(storage, packages)
    return package


async def delete_package(storage: StorageManager, package_id: str) -> bool:
    packages = await _all_packages(storage)
    remaining = [p for p in packages if p["id"] != package_id]
    if len(remaining) == len(packages):
        return False
    await _save(storage, remaining)
    return True
