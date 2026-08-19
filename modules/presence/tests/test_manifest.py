"""Self-contained: checks this module's own manifest.json, without
importing the backend app package, so it can run standalone from any
module's folder."""

import json
from pathlib import Path

MANIFEST_PATH = Path(__file__).parent.parent / "manifest.json"


def test_manifest_is_valid_json() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    assert manifest["name"] == "presence"
    assert manifest["version"]
    assert isinstance(manifest["widgets"], list)
    assert len(manifest["widgets"]) >= 1


def test_manifest_does_not_declare_itself_ambient_safe() -> None:
    """presence has no `"personal": false` - it must default to True
    (hidden while away) same as every other sensitive module, since its
    own status card is itself the kind of personal information away
    mode exists to hide."""
    manifest = json.loads(MANIFEST_PATH.read_text())
    assert "personal" not in manifest
