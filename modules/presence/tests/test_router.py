"""Router-level (HTTP) tests. Mounts the real `router` on a bare
FastAPI app - not the full apps/api app - with a fake storage manager
and the real (in-memory, side-effect-free) EventBus standing in for
`request.app.state`, the same two objects every module's route handlers
actually reach through `request.app.state`. This mirrors
ModuleManager._import_backend_package (apps/api/app/core/module_manager.py)
to load the backend as a real package, so `router.py`'s relative
imports resolve exactly as they do at runtime - see test_state.py's
docstring for why that's necessary here."""

import importlib.util
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

_REPO_ROOT = Path(__file__).parents[3]
_BACKEND_DIR = Path(__file__).parent.parent / "backend"
_PACKAGE_NAME = "alexos_test_presence_backend_router"


def _load_backend():
    api_root = str(_REPO_ROOT / "apps" / "api")
    if api_root not in sys.path:
        sys.path.insert(0, api_root)
    if _PACKAGE_NAME in sys.modules:
        return sys.modules[_PACKAGE_NAME]
    spec = importlib.util.spec_from_file_location(
        _PACKAGE_NAME, _BACKEND_DIR / "__init__.py", submodule_search_locations=[str(_BACKEND_DIR)]
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[_PACKAGE_NAME] = module
    spec.loader.exec_module(module)
    return module


_backend = _load_backend()
_rate_limit = sys.modules[f"{_PACKAGE_NAME}.rate_limit"]
_config_store = sys.modules[f"{_PACKAGE_NAME}.config_store"]

from app.core.event_bus import EventBus  # noqa: E402 - needs apps/api on sys.path first


class FakeStorageManager:
    """Same in-memory stand-in as test_state.py's - duplicated rather
    than imported, since modules/*/tests files are each self-contained
    (no shared __init__.py - see docs/MODULES.md)."""

    def __init__(self) -> None:
        self._data: dict[tuple[str, str], str] = {}

    async def get_module_data(self, module: str, key: str) -> str | None:
        return self._data.get((module, key))

    async def set_module_data(self, module: str, key: str, value: str) -> None:
        self._data[(module, key)] = value


def _make_client() -> TestClient:
    app = FastAPI()
    app.state.storage_manager = FakeStorageManager()
    app.state.event_bus = EventBus()
    app.include_router(_backend.router)
    return TestClient(app)


def setup_function() -> None:
    # rate_limit and config_store are process-global module singletons -
    # reset both before every test, same reasoning as test_state.py.
    _rate_limit._failures = {}
    _config_store._config = {
        "unlockTtlMinutes": _config_store.DEFAULT_UNLOCK_TTL_MINUTES,
        "staleAfterHours": _config_store.DEFAULT_STALE_AFTER_HOURS,
    }


def _register_device(client: TestClient, name: str = "Phone") -> dict:
    response = client.post("/devices", json={"name": name})
    assert response.status_code == 201
    return response.json()


# --- Webhook auth --------------------------------------------------------


def test_webhook_rejects_missing_token() -> None:
    client = _make_client()
    device = _register_device(client)
    response = client.get(f"/webhook?device_id={device['id']}&event=arrive")
    assert response.status_code == 401


def test_webhook_rejects_bad_token() -> None:
    client = _make_client()
    device = _register_device(client)
    response = client.get(f"/webhook?device_id={device['id']}&event=arrive&token=not-the-real-token")
    assert response.status_code == 401


def test_webhook_rejects_unknown_device_id() -> None:
    client = _make_client()
    response = client.get("/webhook?device_id=ghost&event=arrive&token=whatever")
    assert response.status_code == 401


def test_webhook_accepts_good_token_and_updates_state() -> None:
    client = _make_client()
    device = _register_device(client)
    response = client.get(f"/webhook?device_id={device['id']}&event=arrive&token={device['token']}")
    assert response.status_code == 200
    assert response.json()["ok"] is True

    status = client.get("/status").json()
    updated = next(d for d in status["devices"] if d["id"] == device["id"])
    assert updated["event"] == "arrive"
    assert updated["lastSeen"] is not None


def test_webhook_also_accepts_post() -> None:
    client = _make_client()
    device = _register_device(client)
    response = client.post(f"/webhook?device_id={device['id']}&event=leave&token={device['token']}")
    assert response.status_code == 200


def test_webhook_rejects_invalid_event_value_even_with_a_good_token() -> None:
    client = _make_client()
    device = _register_device(client)
    response = client.get(f"/webhook?device_id={device['id']}&event=teleport&token={device['token']}")
    assert response.status_code == 400


def test_webhook_rate_limits_repeated_bad_tokens() -> None:
    client = _make_client()
    device = _register_device(client)
    responses = [
        client.get(f"/webhook?device_id={device['id']}&event=arrive&token=wrong-{i}") for i in range(15)
    ]
    assert all(r.status_code == 401 for r in responses[:10])
    assert any(r.status_code == 429 for r in responses[10:])


# --- OwnTracks (HTTP Basic auth, JSON body) ---------------------------------


def test_owntracks_rejects_missing_auth() -> None:
    client = _make_client()
    _register_device(client)
    response = client.post("/owntracks", json={"_type": "transition", "event": "enter"})
    assert response.status_code == 401


def test_owntracks_rejects_bad_password() -> None:
    client = _make_client()
    device = _register_device(client)
    response = client.post(
        "/owntracks", json={"_type": "transition", "event": "enter"}, auth=(device["id"], "not-the-real-token")
    )
    assert response.status_code == 401


def test_owntracks_rejects_unknown_username() -> None:
    client = _make_client()
    response = client.post("/owntracks", json={"_type": "transition", "event": "enter"}, auth=("ghost", "whatever"))
    assert response.status_code == 401


def test_owntracks_transition_enter_marks_the_device_as_arrived() -> None:
    client = _make_client()
    device = _register_device(client)
    response = client.post(
        "/owntracks",
        json={"_type": "transition", "event": "enter", "desc": "Home", "tid": "AB"},
        auth=(device["id"], device["token"]),
    )
    assert response.status_code == 200
    assert response.json() == []

    status = client.get("/status").json()
    updated = next(d for d in status["devices"] if d["id"] == device["id"])
    assert updated["event"] == "arrive"
    assert updated["lastSeen"] is not None


def test_owntracks_transition_leave_marks_the_device_as_left() -> None:
    client = _make_client()
    device = _register_device(client)
    client.post(
        "/owntracks", json={"_type": "transition", "event": "enter"}, auth=(device["id"], device["token"])
    )
    client.post(
        "/owntracks", json={"_type": "transition", "event": "leave"}, auth=(device["id"], device["token"])
    )

    status = client.get("/status").json()
    updated = next(d for d in status["devices"] if d["id"] == device["id"])
    assert updated["event"] == "leave"


def test_owntracks_plain_location_ping_updates_last_seen_but_not_event() -> None:
    client = _make_client()
    device = _register_device(client)
    client.post(
        "/owntracks", json={"_type": "transition", "event": "enter"}, auth=(device["id"], device["token"])
    )
    response = client.post(
        "/owntracks", json={"_type": "location", "lat": 40.0, "lon": -3.0}, auth=(device["id"], device["token"])
    )
    assert response.status_code == 200

    status = client.get("/status").json()
    updated = next(d for d in status["devices"] if d["id"] == device["id"])
    assert updated["event"] == "arrive"  # unchanged by the location ping
    assert updated["lastEventAt"] is not None
    assert updated["lastSeen"] > updated["lastEventAt"]  # the ping moved lastSeen, not lastEventAt
    assert updated["lastSeen"] is not None


def test_owntracks_ignores_unrecognized_message_types_without_erroring() -> None:
    client = _make_client()
    device = _register_device(client)
    response = client.post("/owntracks", json={"_type": "waypoints"}, auth=(device["id"], device["token"]))
    assert response.status_code == 200
    assert response.json() == []


def test_owntracks_tolerates_a_malformed_body() -> None:
    client = _make_client()
    device = _register_device(client)
    response = client.post(
        "/owntracks", content=b"not json", headers={"Content-Type": "application/json"}, auth=(device["id"], device["token"])
    )
    assert response.status_code == 200


def test_owntracks_and_webhook_share_the_same_rate_limiter() -> None:
    client = _make_client()
    device = _register_device(client)
    for _ in range(10):
        client.post("/owntracks", json={"_type": "transition", "event": "enter"}, auth=(device["id"], "wrong"))
    response = client.get(f"/webhook?device_id={device['id']}&event=arrive&token={device['token']}")
    assert response.status_code == 429


# --- Status ----------------------------------------------------------------


def test_status_defaults_to_not_home_but_not_locked_with_no_pin_set() -> None:
    """Regression test: locking with no PIN configured yet would seal the
    owner out of Settings (the only place a PIN can be set), permanently -
    see modules/presence/backend/state.py's compute_status."""
    client = _make_client()
    status = client.get("/status").json()
    assert status == {
        "locked": False,
        "home": False,
        "primaryDeviceId": None,
        "pinConfigured": False,
        "devices": [],
    }


def test_status_locked_once_a_pin_is_set_and_still_not_home() -> None:
    client = _make_client()
    client.post("/pin", json={"newPin": "1234"})
    status = client.get("/status").json()
    assert status["locked"] is True
    assert status["home"] is False


def test_status_reflects_arrive_then_leave_for_the_primary_device() -> None:
    client = _make_client()
    device = _register_device(client)
    client.post(f"/devices/{device['id']}/primary")

    client.get(f"/webhook?device_id={device['id']}&event=arrive&token={device['token']}")
    assert client.get("/status").json()["home"] is True

    client.get(f"/webhook?device_id={device['id']}&event=leave&token={device['token']}")
    assert client.get("/status").json()["home"] is False


# --- Devices -----------------------------------------------------------------


def test_created_device_token_returned_once_then_omitted_from_the_list() -> None:
    client = _make_client()
    device = _register_device(client)
    assert "token" in device

    listed = client.get("/devices").json()
    assert all("token" not in entry for entry in listed)


def test_device_token_still_retrievable_via_the_reveal_endpoint() -> None:
    client = _make_client()
    device = _register_device(client)
    revealed = client.get(f"/devices/{device['id']}/token").json()
    assert revealed["token"] == device["token"]


def test_rename_and_delete_device() -> None:
    client = _make_client()
    device = _register_device(client, "Old name")

    renamed = client.patch(f"/devices/{device['id']}", json={"name": "New name"})
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "New name"

    deleted = client.delete(f"/devices/{device['id']}")
    assert deleted.status_code == 204
    assert client.get("/devices").json() == []


def test_setting_primary_device_switches_which_device_drives_home() -> None:
    client = _make_client()
    phone_a = _register_device(client, "Phone A")
    phone_b = _register_device(client, "Phone B")
    client.get(f"/webhook?device_id={phone_a['id']}&event=arrive&token={phone_a['token']}")
    client.get(f"/webhook?device_id={phone_b['id']}&event=leave&token={phone_b['token']}")

    client.post(f"/devices/{phone_a['id']}/primary")
    assert client.get("/status").json()["home"] is True

    client.post(f"/devices/{phone_b['id']}/primary")
    assert client.get("/status").json()["home"] is False


# --- PIN and unlock/lock ---------------------------------------------------


def test_setting_a_pin_for_the_first_time_needs_no_current_pin() -> None:
    client = _make_client()
    response = client.post("/pin", json={"newPin": "1234"})
    assert response.status_code == 200
    assert client.get("/status").json()["pinConfigured"] is True


def test_changing_the_pin_requires_the_current_pin() -> None:
    client = _make_client()
    client.post("/pin", json={"newPin": "1234"})

    rejected = client.post("/pin", json={"newPin": "5678"})
    assert rejected.status_code == 401

    accepted = client.post("/pin", json={"newPin": "5678", "currentPin": "1234"})
    assert accepted.status_code == 200


def test_unlock_succeeds_with_correct_pin() -> None:
    client = _make_client()
    client.post("/pin", json={"newPin": "1234"})
    response = client.post("/unlock", json={"pin": "1234"})
    assert response.status_code == 200
    assert response.json()["locked"] is False


def test_unlock_fails_with_wrong_pin_without_leaking_whether_a_pin_exists() -> None:
    client = _make_client()
    client.post("/pin", json={"newPin": "1234"})
    with_pin = client.post("/unlock", json={"pin": "0000"})

    client_no_pin = _make_client()
    without_pin = client_no_pin.post("/unlock", json={"pin": "0000"})

    assert with_pin.status_code == without_pin.status_code == 401
    assert with_pin.json() == without_pin.json()


def test_lock_immediately_re_locks_an_unlocked_session() -> None:
    client = _make_client()
    client.post("/pin", json={"newPin": "1234"})
    client.post("/unlock", json={"pin": "1234"})
    assert client.get("/status").json()["locked"] is False

    locked = client.post("/lock")
    assert locked.status_code == 200
    assert locked.json()["locked"] is True
