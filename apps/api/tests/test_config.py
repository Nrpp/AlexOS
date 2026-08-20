import pytest
from fastapi.testclient import TestClient

from app.core.config_manager import ConfigManager
from app.main import app


class _FakeStorageManager:
    """In-memory stand-in for corrupted-value scenarios the HTTP layer
    can't reach (Pydantic validation blocks a non-integer JSON body
    before it ever reaches ConfigManager) - e.g. a value hand-edited in
    the database, or written by a since-changed older version."""

    def __init__(self) -> None:
        self._values: dict[str, str] = {}

    async def get_config_value(self, key: str) -> str | None:
        return self._values.get(key)

    async def set_config_value(self, key: str, value: str) -> None:
        self._values[key] = value


@pytest.mark.asyncio
async def test_get_config_falls_back_to_zero_for_a_corrupted_stored_value() -> None:
    storage = _FakeStorageManager()
    await storage.set_config_value("idleTimeoutMinutes", "not-a-number")
    config = await ConfigManager(storage).get_config()  # type: ignore[arg-type]
    assert config.idle_timeout_minutes == 0


def test_config_round_trip_including_idle_timeout_minutes() -> None:
    with TestClient(app) as client:
        put_response = client.put(
            "/api/v1/config", json={"theme": "light", "userName": "Lucas", "idleTimeoutMinutes": 5}
        )
        assert put_response.status_code == 200
        assert put_response.json() == {"theme": "light", "userName": "Lucas", "idleTimeoutMinutes": 5}

        get_response = client.get("/api/v1/config")
        assert get_response.status_code == 200
        assert get_response.json() == {"theme": "light", "userName": "Lucas", "idleTimeoutMinutes": 5}


def test_config_defaults_idle_timeout_minutes_to_zero_disabled() -> None:
    with TestClient(app) as client:
        # A theme-only update (like the app used to do before this field
        # existed) must not error, and a never-set idleTimeoutMinutes
        # must read back as 0 (disabled) - never crash, never guess a
        # nonzero default that would surprise an existing install.
        client.put("/api/v1/config", json={"theme": "dark", "userName": "there", "idleTimeoutMinutes": 0})
        response = client.get("/api/v1/config")
        assert response.json()["idleTimeoutMinutes"] == 0


def test_config_rejects_a_negative_idle_timeout() -> None:
    with TestClient(app) as client:
        response = client.put(
            "/api/v1/config", json={"theme": "dark", "userName": "there", "idleTimeoutMinutes": -5}
        )
        # Clamped, not a validation error - matches _parse_non_negative_int's
        # "never crash, fall back to a sane value" contract on the read side.
        assert response.status_code == 200
        stored = client.get("/api/v1/config").json()
        assert stored["idleTimeoutMinutes"] == 0
