from fastapi.testclient import TestClient

from app.main import app


def test_home_widgets_and_modules_endpoints() -> None:
    """One shared TestClient for every assertion in this file - each
    `with TestClient(app)` fully re-runs app startup/shutdown (module
    discovery, every module's on_load), so instantiating it once per
    test rather than once per assertion avoids piling up redundant
    background tick-loop tasks across the test session."""
    with TestClient(app) as client:
        put_response = client.put("/api/v1/config/home-widgets", json={"moduleNames": ["clock", "notes"]})
        assert put_response.status_code == 200
        assert put_response.json() == {"moduleNames": ["clock", "notes"]}

        get_response = client.get("/api/v1/config/home-widgets")
        assert get_response.status_code == 200
        assert get_response.json() == {"moduleNames": ["clock", "notes"]}

        client.put("/api/v1/config/home-widgets", json={"moduleNames": ["notes", "quotes"]})
        latest_response = client.get("/api/v1/config/home-widgets")
        assert latest_response.json() == {"moduleNames": ["notes", "quotes"]}

        client.put("/api/v1/config/home-widgets", json={"moduleNames": []})
        empty_response = client.get("/api/v1/config/home-widgets")
        assert empty_response.json() == {"moduleNames": []}

        modules_response = client.get("/api/v1/modules")
        assert modules_response.status_code == 200
        modules_body = modules_response.json()
        assert isinstance(modules_body, list)
        assert len(modules_body) > 0
        names = [entry["manifest"]["name"] for entry in modules_body]
        assert "clock" in names
        assert "notes" in names
