import httpx
import pytest

from app.core.google_auth import GoogleAuth, GoogleAuthExpiredError


def _configure_env(monkeypatch) -> None:
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "secret")
    monkeypatch.setenv("GOOGLE_REFRESH_TOKEN", "token")


@pytest.mark.asyncio
async def test_invalid_grant_raises_google_auth_expired_error(monkeypatch) -> None:
    """Regression test: a revoked/expired refresh token (the classic
    symptom of an OAuth consent screen stuck in "Testing" publishing
    status, where Google auto-expires tokens after 7 days) used to
    surface as a generic httpx.HTTPStatusError, indistinguishable from
    a transient network failure - hiding an issue that needs the user
    to re-run scripts/google_oauth_setup.py, not just retry."""
    _configure_env(monkeypatch)
    auth = GoogleAuth()

    async def fake_post(self, url, data=None, **kwargs):
        return httpx.Response(
            400, json={"error": "invalid_grant", "error_description": "Bad Request"}, request=httpx.Request("POST", url)
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    with pytest.raises(GoogleAuthExpiredError):
        await auth.get_access_token()


@pytest.mark.asyncio
async def test_other_400_error_is_not_mistaken_for_expired_grant(monkeypatch) -> None:
    """Guards against solving the bug above by catching every 400
    response as an expired grant - only the specific invalid_grant body
    should trigger GoogleAuthExpiredError."""
    _configure_env(monkeypatch)
    auth = GoogleAuth()

    async def fake_post(self, url, data=None, **kwargs):
        return httpx.Response(400, json={"error": "invalid_request"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    with pytest.raises(httpx.HTTPStatusError):
        await auth.get_access_token()


def test_not_configured_without_env_vars(monkeypatch) -> None:
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("GOOGLE_REFRESH_TOKEN", raising=False)

    auth = GoogleAuth()

    assert auth.is_configured is False


def test_configured_when_all_three_env_vars_present(monkeypatch) -> None:
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "secret")
    monkeypatch.setenv("GOOGLE_REFRESH_TOKEN", "token")

    auth = GoogleAuth()

    assert auth.is_configured is True
