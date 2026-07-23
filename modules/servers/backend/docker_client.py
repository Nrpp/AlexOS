"""Talks to the Docker Engine API over the host's Docker socket
(`/var/run/docker.sock`), bind-mounted into this container - see
docker-compose.yml's comment on the security tradeoff that requires
(socket access is root-equivalent host control). Uses httpx's Unix
domain socket transport instead of the `docker` SDK, avoiding a new
dependency for what's a handful of endpoints; the socket only speaks
plain HTTP, so "http://docker" is a dummy base URL purely to satisfy
httpx's URL parsing - it's never resolved over the network."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import httpx

_SOCKET_PATH = os.environ.get("DOCKER_SOCKET_PATH", "/var/run/docker.sock")
_BASE_URL = "http://docker"
_ACTIONS = {"start", "stop", "restart"}


@dataclass
class Container:
    id: str
    name: str
    image: str
    state: str
    status: str


def container_to_payload(container: Container) -> dict[str, Any]:
    return {
        "id": container.id,
        "name": container.name,
        "image": container.image,
        "state": container.state,
        "status": container.status,
    }


def is_available() -> bool:
    return os.path.exists(_SOCKET_PATH)


def _client() -> httpx.AsyncClient:
    transport = httpx.AsyncHTTPTransport(uds=_SOCKET_PATH)
    return httpx.AsyncClient(transport=transport, base_url=_BASE_URL, timeout=10.0)


async def list_containers() -> list[Container] | None:
    """None means the Docker socket isn't mounted/available - distinct
    from an empty list (no containers)."""
    if not is_available():
        return None
    async with _client() as client:
        response = await client.get("/containers/json", params={"all": "true"})
        response.raise_for_status()
        entries = response.json()

    return [
        Container(
            id=entry["Id"][:12],
            name=entry.get("Names", ["/unknown"])[0].lstrip("/"),
            image=entry.get("Image", ""),
            state=entry.get("State", ""),
            status=entry.get("Status", ""),
        )
        for entry in entries
    ]


async def container_action(container_id: str, action: str) -> bool | None:
    """None means the socket isn't available, False means the container
    wasn't found, True means the action was accepted."""
    if action not in _ACTIONS:
        raise ValueError(f"Unsupported action: {action!r}")
    if not is_available():
        return None
    async with _client() as client:
        response = await client.post(f"/containers/{container_id}/{action}")
        if response.status_code == 404:
            return False
        response.raise_for_status()
    return True
