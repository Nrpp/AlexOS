import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_github_activity_state"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_module()


def test_describe_event_push() -> None:
    event = {"type": "PushEvent", "repo": {"name": "Nrpp/AlexOS"}, "created_at": "2026-07-24T10:00:00Z"}
    result = state.describe_event(event)
    assert result["description"] == "pushed to Nrpp/AlexOS"
    assert result["repo"] == "Nrpp/AlexOS"


def test_describe_event_unknown_type_falls_back_to_type_name() -> None:
    event = {"type": "SomeNewEventType", "repo": {"name": "Nrpp/AlexOS"}, "created_at": "2026-07-24T10:00:00Z"}
    result = state.describe_event(event)
    assert result["description"] == "SomeNewEventType Nrpp/AlexOS"
