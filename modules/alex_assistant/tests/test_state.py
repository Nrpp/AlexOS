import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_alex_assistant_state"
_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_state():
    # state.py has no `app.*` imports (unlike connection.py/router.py), so
    # it can be loaded standalone without apps/api on sys.path - see
    # modules/communication/tests/test_body_extraction.py for the same
    # pattern used where a sibling file does need it.
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _STATE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_state()


def test_map_priority_covers_the_full_alex_scale() -> None:
    assert state.map_priority(0) == "information"
    assert state.map_priority(1) == "information"
    assert state.map_priority(2) == "warning"
    assert state.map_priority(3) == "critical"


def test_map_priority_falls_back_to_information_for_unknown_values() -> None:
    assert state.map_priority(99) == "information"


def test_not_configured_without_a_base_url(monkeypatch) -> None:
    monkeypatch.delenv("ALEX_ASSISTANT_BASE_URL", raising=False)
    monkeypatch.delenv("ALEX_ASSISTANT_API_TOKEN", raising=False)
    client = state.AlexAssistantClient()
    assert client.is_configured is False


def test_configured_with_only_a_base_url_no_token_required(monkeypatch) -> None:
    # Matches Proyect-ALEX's own auth: an unset token means "open/insecure
    # local dev mode", not "unusable" - see alex/server/auth.py there.
    monkeypatch.setenv("ALEX_ASSISTANT_BASE_URL", "http://alex-pi.local:8787")
    monkeypatch.delenv("ALEX_ASSISTANT_API_TOKEN", raising=False)
    client = state.AlexAssistantClient()
    assert client.is_configured is True


def test_ws_url_derives_from_http_base_url_and_includes_the_token(monkeypatch) -> None:
    monkeypatch.setenv("ALEX_ASSISTANT_BASE_URL", "http://alex-pi.local:8787")
    monkeypatch.setenv("ALEX_ASSISTANT_API_TOKEN", "secret123")
    client = state.AlexAssistantClient()
    assert client.ws_url == "ws://alex-pi.local:8787/ws?client_id=alexos&token=secret123"


def test_ws_url_derives_wss_from_https_base_url(monkeypatch) -> None:
    monkeypatch.setenv("ALEX_ASSISTANT_BASE_URL", "https://alex.example.com")
    monkeypatch.delenv("ALEX_ASSISTANT_API_TOKEN", raising=False)
    client = state.AlexAssistantClient()
    assert client.ws_url == "wss://alex.example.com/ws?client_id=alexos"


def test_base_url_trailing_slash_is_stripped(monkeypatch) -> None:
    monkeypatch.setenv("ALEX_ASSISTANT_BASE_URL", "http://alex-pi.local:8787/")
    monkeypatch.delenv("ALEX_ASSISTANT_API_TOKEN", raising=False)
    client = state.AlexAssistantClient()
    assert client.base_url == "http://alex-pi.local:8787"
