import asyncio
import importlib.util
import sys
from pathlib import Path

import pytest

_MODULE_NAME = "alexos_test_servers_docker_client"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "docker_client.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


docker_client = _load_module()


def test_is_available_false_when_socket_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(docker_client, "_SOCKET_PATH", "/nonexistent/path/docker.sock")
    assert docker_client.is_available() is False


def test_list_containers_returns_none_when_socket_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(docker_client, "_SOCKET_PATH", "/nonexistent/path/docker.sock")
    assert asyncio.run(docker_client.list_containers()) is None


def test_container_action_returns_none_when_socket_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(docker_client, "_SOCKET_PATH", "/nonexistent/path/docker.sock")
    assert asyncio.run(docker_client.container_action("abc123", "start")) is None


def test_container_action_rejects_unsupported_action() -> None:
    with pytest.raises(ValueError):
        asyncio.run(docker_client.container_action("abc123", "delete"))


def test_container_to_payload() -> None:
    container = docker_client.Container(id="abc123", name="alexos-api", image="alexos/api:latest", state="running", status="Up 3 hours")
    assert docker_client.container_to_payload(container) == {
        "id": "abc123",
        "name": "alexos-api",
        "image": "alexos/api:latest",
        "state": "running",
        "status": "Up 3 hours",
    }
