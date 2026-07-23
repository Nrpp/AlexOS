from __future__ import annotations

from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .docker_client import container_action, container_to_payload, list_containers
from .state import provider, stats_to_payload

router = APIRouter()


@router.get("/stats")
async def get_stats() -> dict:
    return stats_to_payload(provider.read())


@router.get("/containers")
async def get_containers() -> dict:
    try:
        containers = await list_containers()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach the Docker socket.") from error
    if containers is None:
        return {"available": False, "containers": []}
    return {"available": True, "containers": [container_to_payload(container) for container in containers]}


class ContainerActionRequest(BaseModel):
    action: Literal["start", "stop", "restart"]


@router.post("/containers/{container_id}/action")
async def post_container_action(container_id: str, body: ContainerActionRequest) -> dict:
    try:
        result = await container_action(container_id, body.action)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach the Docker socket.") from error
    if result is None:
        raise HTTPException(status_code=503, detail="Docker socket isn't mounted - see modules/servers/README.md.")
    if result is False:
        raise HTTPException(status_code=404, detail="Container not found.")
    return {"id": container_id, "action": body.action}
