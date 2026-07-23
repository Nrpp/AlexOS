import base64
import importlib.util
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_communication_state"
_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_state():
    # state.py imports `app.core.google_auth` - only importable once
    # apps/api is on sys.path, which isn't the case when pytest runs
    # from the repo root (testpaths = ["modules"], see pyproject.toml).
    api_root = str(_REPO_ROOT / "apps" / "api")
    if api_root not in sys.path:
        sys.path.insert(0, api_root)

    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _STATE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_state()


def _b64(text: str) -> str:
    return base64.urlsafe_b64encode(text.encode()).decode()


def test_extract_body_text_from_simple_plain_message() -> None:
    payload = {"mimeType": "text/plain", "body": {"data": _b64("Hello there.")}}
    assert state.extract_body_text(payload) == "Hello there."


def test_extract_body_text_prefers_plain_over_html_in_multipart() -> None:
    payload = {
        "mimeType": "multipart/alternative",
        "parts": [
            {"mimeType": "text/html", "body": {"data": _b64("<p>Hi <b>there</b></p>")}},
            {"mimeType": "text/plain", "body": {"data": _b64("Hi there")}},
        ],
    }
    assert state.extract_body_text(payload) == "Hi there"


def test_extract_body_text_strips_html_when_only_html_available() -> None:
    payload = {
        "mimeType": "multipart/alternative",
        "parts": [
            {"mimeType": "text/html", "body": {"data": _b64("<p>Line one</p><p>Line two</p>")}},
        ],
    }
    result = state.extract_body_text(payload)
    assert "Line one" in result
    assert "Line two" in result
    assert "<p>" not in result


def test_extract_body_text_handles_nested_multipart() -> None:
    payload = {
        "mimeType": "multipart/mixed",
        "parts": [
            {
                "mimeType": "multipart/alternative",
                "parts": [
                    {"mimeType": "text/plain", "body": {"data": _b64("Nested body")}},
                ],
            },
        ],
    }
    assert state.extract_body_text(payload) == "Nested body"


def test_extract_body_text_returns_empty_string_when_no_body_found() -> None:
    assert state.extract_body_text({"mimeType": "multipart/mixed", "parts": []}) == ""
