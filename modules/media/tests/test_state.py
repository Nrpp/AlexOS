import importlib.util
import sys
from pathlib import Path

import httpx
import pytest

_MODULE_NAME = "alexos_test_media_state"
_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_state():
    # state.py has no `app.*` imports - loadable standalone, no
    # apps/api-on-sys.path dance needed.
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _STATE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_state()


def test_not_configured_without_env_vars(monkeypatch) -> None:
    monkeypatch.delenv("SPOTIFY_CLIENT_ID", raising=False)
    monkeypatch.delenv("SPOTIFY_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("SPOTIFY_REFRESH_TOKEN", raising=False)

    assert state.SpotifyAuth().is_configured is False


def test_configured_when_all_three_env_vars_present(monkeypatch) -> None:
    monkeypatch.setenv("SPOTIFY_CLIENT_ID", "id")
    monkeypatch.setenv("SPOTIFY_CLIENT_SECRET", "secret")
    monkeypatch.setenv("SPOTIFY_REFRESH_TOKEN", "token")

    assert state.SpotifyAuth().is_configured is True


@pytest.mark.asyncio
async def test_invalid_grant_raises_spotify_auth_expired_error(monkeypatch) -> None:
    monkeypatch.setenv("SPOTIFY_CLIENT_ID", "id")
    monkeypatch.setenv("SPOTIFY_CLIENT_SECRET", "secret")
    monkeypatch.setenv("SPOTIFY_REFRESH_TOKEN", "token")
    auth = state.SpotifyAuth()

    async def fake_post(self, url, data=None, headers=None, **kwargs):
        return httpx.Response(400, json={"error": "invalid_grant"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    with pytest.raises(state.SpotifyAuthExpiredError):
        await auth.get_access_token()


@pytest.mark.asyncio
async def test_now_playing_reports_not_configured(monkeypatch) -> None:
    monkeypatch.setattr(state.spotify_auth, "get_access_token", _fake_none_token)
    payload = await state.now_playing()
    assert payload["configured"] is False


@pytest.mark.asyncio
async def test_now_playing_reports_nothing_playing_on_204(monkeypatch) -> None:
    monkeypatch.setattr(state.spotify_auth, "get_access_token", _fake_token)

    async def fake_get(self, url, headers=None, **kwargs):
        return httpx.Response(204, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    payload = await state.now_playing()
    assert payload == {
        "configured": True, "title": "", "artist": "", "durationSeconds": 0, "positionSeconds": 0, "isPlaying": False,
    }


@pytest.mark.asyncio
async def test_now_playing_maps_a_real_track_response(monkeypatch) -> None:
    monkeypatch.setattr(state.spotify_auth, "get_access_token", _fake_token)

    async def fake_get(self, url, headers=None, **kwargs):
        return httpx.Response(
            200,
            json={
                "item": {"name": "Song Title", "duration_ms": 210000, "artists": [{"name": "Artist A"}, {"name": "Artist B"}]},
                "progress_ms": 45000,
                "is_playing": True,
            },
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    payload = await state.now_playing()
    assert payload == {
        "configured": True,
        "title": "Song Title",
        "artist": "Artist A, Artist B",
        "durationSeconds": 210,
        "positionSeconds": 45,
        "isPlaying": True,
    }


@pytest.mark.asyncio
async def test_control_raises_no_active_device_error_on_404(monkeypatch) -> None:
    monkeypatch.setattr(state.spotify_auth, "get_access_token", _fake_token)

    async def fake_request(self, method, url, headers=None, **kwargs):
        return httpx.Response(404, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx.AsyncClient, "request", fake_request)

    with pytest.raises(state.NoActiveDeviceError):
        await state.play()


@pytest.mark.asyncio
async def test_control_is_a_noop_when_not_configured(monkeypatch) -> None:
    monkeypatch.setattr(state.spotify_auth, "get_access_token", _fake_none_token)

    async def fake_request(self, method, url, headers=None, **kwargs):
        raise AssertionError("should not have made a request when not configured")

    monkeypatch.setattr(httpx.AsyncClient, "request", fake_request)

    await state.play()  # must not raise


async def _fake_token() -> str | None:
    return "fake-access-token"


async def _fake_none_token() -> str | None:
    return None
