import json
from pathlib import Path

MANIFEST_PATH = Path(__file__).parent.parent / "manifest.json"


def test_manifest_is_valid_json() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    assert manifest["name"] == "recipe_idea"
    assert manifest["version"]
    assert isinstance(manifest["widgets"], list)
    assert len(manifest["widgets"]) >= 1
