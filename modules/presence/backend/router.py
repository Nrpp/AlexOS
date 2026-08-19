"""Every route below except `/webhook` is LAN-only, same trust model as
the rest of AlexOS (see docs/MODULES.md and the repo-wide "no auth by
design" note). `/webhook` is the one exception - it's meant to be
called from outside the LAN, by the owner's own phone, so it's the only
route in this whole codebase that requires a secret to call. See
modules/presence/README.md for the full security model.

Imports names explicitly out of every sibling file (`from .state import
compute_status`, not `from . import state`) per docs/MODULES.md's
import gotcha - importing a sibling module itself as an attribute
raises ModuleNotFoundError under the Module Manager's dynamic import,
first hit building modules/control_center."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from .config_store import unlock_ttl_minutes
from .rate_limit import is_rate_limited, record_failure
from .rate_limit import reset as reset_rate_limit
from .security import tokens_match
from .state import (
    compute_status,
    create_device,
    delete_device,
    get_device,
    is_pin_configured,
    list_devices,
    lock as lock_session,
    record_event,
    rename_device,
    set_pin,
    set_primary_device_id,
    unlock as unlock_session,
    verify_stored_pin,
)

router = APIRouter()

_VALID_EVENTS = {"arrive", "leave"}
_MIN_PIN_LENGTH = 4
_MAX_PIN_LENGTH = 8


def _client_identity(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _is_valid_pin_format(pin: str) -> bool:
    return pin.isdigit() and _MIN_PIN_LENGTH <= len(pin) <= _MAX_PIN_LENGTH


async def _publish_status(request: Request) -> dict:
    status = await compute_status(request.app.state.storage_manager)
    await request.app.state.event_bus.publish("presence.updated", status, source="presence", retain=True)
    return status


# --- The webhook (internet-facing) ------------------------------------------


@router.api_route("/webhook", methods=["GET", "POST"])
async def webhook(
    request: Request,
    device_id: str | None = Query(default=None),
    event: str | None = Query(default=None),
    token: str | None = Query(default=None),
) -> dict:
    """Called by the phone's own OS automation (iOS Shortcuts / Android
    Tasker) when it crosses a geofence it already evaluated - AlexOS
    never sees raw GPS, only "device X arrived/left". GET and POST both
    work with the same query-string shape, since that's what's easiest
    to configure from either platform's "call this URL" action.

    Auth happens before anything else, and missing/bad token collapse
    to the exact same 401 - an attacker probing this endpoint learns
    nothing about which device_ids are real or whether they merely
    forgot the token."""
    identity = _client_identity(request)
    if is_rate_limited(identity):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    storage = request.app.state.storage_manager
    device = await get_device(storage, device_id) if device_id else None
    if device is None or not token or not tokens_match(token, device["token"]):
        record_failure(identity, device_id=device_id)
        raise HTTPException(status_code=401, detail="Invalid device or token.")

    if event not in _VALID_EVENTS:
        raise HTTPException(status_code=400, detail="event must be 'arrive' or 'leave'.")

    reset_rate_limit(identity)
    updated = await record_event(storage, device_id, event)
    await _publish_status(request)
    return {"ok": True, "deviceId": device_id, "event": updated["event"] if updated else event}


# --- Status ------------------------------------------------------------------


@router.get("/status")
async def get_status(request: Request) -> dict:
    return await compute_status(request.app.state.storage_manager)


# --- Devices -----------------------------------------------------------------


class CreateDeviceRequest(BaseModel):
    name: str


class RenameDeviceRequest(BaseModel):
    name: str


@router.get("/devices")
async def get_devices(request: Request) -> list[dict]:
    devices = await list_devices(request.app.state.storage_manager)
    # Never the token - see GET /devices/{deviceId}/token for the
    # explicit, on-demand "reveal" the frontend calls only when asked.
    return [
        {
            "id": device["id"],
            "name": device["name"],
            "event": device.get("event"),
            "lastSeen": device.get("lastSeen"),
            "createdAt": device.get("createdAt"),
        }
        for device in devices
    ]


@router.post("/devices", status_code=201)
async def post_device(body: CreateDeviceRequest, request: Request) -> dict:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required.")
    device = await create_device(request.app.state.storage_manager, name)
    return {"id": device["id"], "name": device["name"], "token": device["token"]}


@router.patch("/devices/{device_id}")
async def patch_device(device_id: str, body: RenameDeviceRequest, request: Request) -> dict:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required.")
    device = await rename_device(request.app.state.storage_manager, device_id, name)
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found.")
    return {"id": device["id"], "name": device["name"]}


@router.delete("/devices/{device_id}", status_code=204, response_model=None)
async def remove_device(device_id: str, request: Request) -> None:
    deleted = await delete_device(request.app.state.storage_manager, device_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Device not found.")
    await _publish_status(request)


@router.get("/devices/{device_id}/token")
async def get_device_token(device_id: str, request: Request) -> dict:
    """The one place a device's plaintext token is ever returned after
    creation - called only when the Settings UI's "reveal" control is
    used, never fetched in bulk with the device list."""
    device = await get_device(request.app.state.storage_manager, device_id)
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found.")
    return {"id": device["id"], "token": device["token"]}


@router.post("/devices/{device_id}/primary")
async def post_primary_device(device_id: str, request: Request) -> dict:
    device = await get_device(request.app.state.storage_manager, device_id)
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found.")
    await set_primary_device_id(request.app.state.storage_manager, device_id)
    return await _publish_status(request)


# --- PIN and lock/unlock ---------------------------------------------------


class SetPinRequest(BaseModel):
    newPin: str
    currentPin: str | None = None


class UnlockRequest(BaseModel):
    pin: str


@router.post("/pin")
async def post_pin(body: SetPinRequest, request: Request) -> dict:
    storage = request.app.state.storage_manager
    if not _is_valid_pin_format(body.newPin):
        raise HTTPException(status_code=400, detail=f"PIN must be {_MIN_PIN_LENGTH}-{_MAX_PIN_LENGTH} digits.")
    if await is_pin_configured(storage):
        if not body.currentPin or not await verify_stored_pin(storage, body.currentPin):
            raise HTTPException(status_code=401, detail="Current PIN is incorrect.")
    await set_pin(storage, body.newPin)
    return {"ok": True}


@router.post("/unlock")
async def post_unlock(body: UnlockRequest, request: Request) -> dict:
    """Wrong PIN and "no PIN configured yet" return the exact same 401 -
    never reveal which one happened, so a stranger poking at a kiosk
    can't even learn whether away-mode has a PIN set up at all."""
    storage = request.app.state.storage_manager
    if not await verify_stored_pin(storage, body.pin):
        raise HTTPException(status_code=401, detail="Incorrect PIN.")
    await unlock_session(storage, unlock_ttl_minutes())
    return {"ok": True, **await _publish_status(request)}


@router.post("/lock")
async def post_lock(request: Request) -> dict:
    await lock_session(request.app.state.storage_manager)
    return {"ok": True, **await _publish_status(request)}
