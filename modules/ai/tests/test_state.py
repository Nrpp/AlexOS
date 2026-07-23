import importlib.util
import sys
from pathlib import Path

_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"
_MODULE_NAME = "alexos_test_ai_state"
_spec = importlib.util.spec_from_file_location(_MODULE_NAME, _STATE_PATH)
assert _spec is not None and _spec.loader is not None
state = importlib.util.module_from_spec(_spec)
sys.modules[_MODULE_NAME] = state
_spec.loader.exec_module(state)


def test_matching_rule_wins_over_fallback() -> None:
    state.configure(
        {
            "rules": [{"keywords": ["weather"], "reply": "check the weather card"}],
            "fallbackReply": "fallback",
        }
    )
    reply = state.send_message("What's the weather like?")
    assert reply.text == "check the weather card"


def test_fallback_used_when_no_rule_matches() -> None:
    state.configure({"rules": [{"keywords": ["weather"], "reply": "x"}], "fallbackReply": "fallback"})
    reply = state.send_message("Completely unrelated message")
    assert reply.text == "fallback"
