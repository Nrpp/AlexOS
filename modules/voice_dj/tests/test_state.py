import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_voice_dj_state"
_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_state():
    # state.py has no `app.*` imports - loadable standalone.
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _STATE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state_mod = _load_state()


def test_fresh_state_is_offline() -> None:
    s = state_mod.VoiceDJState()
    assert s.agent_online is False
    payload = s.to_payload()
    assert payload["mode"] == "offline"
    assert payload["agentOnline"] is False


def test_heartbeat_marks_online_and_mirrors_fields() -> None:
    s = state_mod.VoiceDJState()
    s.update_from_agent(
        {"mode": "listening", "speakerConnected": True, "nowPlaying": "Radio Paradise", "source": "radio"}
    )
    assert s.agent_online is True
    payload = s.to_payload()
    assert payload["mode"] == "listening"
    assert payload["speakerConnected"] is True
    assert payload["nowPlaying"] == "Radio Paradise"
    assert payload["source"] == "radio"


def test_commands_are_handed_out_once() -> None:
    s = state_mod.VoiceDJState()
    s.enqueue_command("play", "spotify")
    s.enqueue_command("stop")
    first = s.drain_commands()
    assert [c["action"] for c in first] == ["play", "stop"]
    assert first[0]["source"] == "spotify"
    # Drained - a second poll returns nothing.
    assert s.drain_commands() == []


def test_command_ids_are_unique_and_increasing() -> None:
    s = state_mod.VoiceDJState()
    a = s.enqueue_command("play")
    b = s.enqueue_command("stop")
    assert a["id"] != b["id"]
    assert b["id"] > a["id"]
