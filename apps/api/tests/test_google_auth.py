from app.core.google_auth import GoogleAuth


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
