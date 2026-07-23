"""Self-contained: checks this module's own manifest.json, without
importing the backend app package, so it can run standalone from any
module's folder."""

import json
from pathlib import Path

MANIFEST_PATH = Path(__file__).parent.parent / "manifest.json"


def test_manifest_is_valid_json() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    assert manifest["name"] == "clock"
    assert manifest["version"]
    assert isinstance(manifest["widgets"], list)
    assert len(manifest["widgets"]) >= 1
