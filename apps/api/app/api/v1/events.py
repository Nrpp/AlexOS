"""The frontend's one and only real-time channel: a WebSocket that mirrors
every event on the Core Event Bus. A REST fallback lets modules or tools
without a persistent connection publish an event too."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

logger = logging.getLogger("alexos.api.events")

router = APIRouter()


class PublishEventRequest(BaseModel):
    name: str
    payload: object = None


@router.post("/events")
async def publish_event(body: PublishEventRequest, request: Request) -> dict:
    return await request.app.state.event_bus.publish(body.name, body.payload, source="api")


@router.websocket("/events/ws")
async def events_websocket(websocket: WebSocket) -> None:
    event_bus = websocket.app.state.event_bus
    await websocket.accept()
    client_id = str(id(websocket))

    async def forward(envelope: dict) -> None:
        try:
            await websocket.send_json(envelope)
        except Exception:
            logger.debug("Dropped event send to a closed socket (client %s)", client_id)

    unsubscribe = event_bus.subscribe("*", forward)
    await event_bus.publish("core.connected", {"clientId": client_id}, source="api")

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
                await event_bus.publish(message["name"], message.get("payload"), source=client_id)
            except (json.JSONDecodeError, KeyError):
                logger.warning("Ignoring malformed message from client %s", client_id)
    except WebSocketDisconnect:
        pass
    finally:
        unsubscribe()
        await event_bus.publish("core.disconnected", {"clientId": client_id}, source="api")
