import json
from pathlib import Path

MANIFEST_PATH = Path(__file__).parent.parent / "manifest.json"
CONFIG_PATH = Path(__file__).parent.parent / "config.json"


def test_manifest_is_valid_json() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    assert manifest["name"] == "voice_dj"
    assert manifest["version"]
    assert isinstance(manifest["widgets"], list)
    assert len(manifest["widgets"]) >= 1


def test_config_is_valid_json_with_expected_keys() -> None:
    config = json.loads(CONFIG_PATH.read_text())
    assert "wakeWord" in config
    assert "commands" in config and "play" in config["commands"]
    assert "music" in config and config["music"]["radioStreamUrl"]
    assert "agent" in config and config["agent"]["apiBaseUrl"]
