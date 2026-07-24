import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_rss_reader_state"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_module()

_SAMPLE_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example Feed</title>
    <item>
      <title>First headline</title>
      <link>https://example.com/first</link>
      <pubDate>Fri, 24 Jul 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second headline</title>
      <link>https://example.com/second</link>
      <pubDate>Fri, 24 Jul 2026 09:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Third headline</title>
      <link>https://example.com/third</link>
      <pubDate>Fri, 24 Jul 2026 08:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""


def test_parse_rss_extracts_items() -> None:
    items = state.parse_rss(_SAMPLE_RSS, max_items=10)
    assert len(items) == 3
    assert items[0] == {
        "title": "First headline",
        "link": "https://example.com/first",
        "pubDate": "Fri, 24 Jul 2026 10:00:00 GMT",
    }


def test_parse_rss_respects_max_items() -> None:
    items = state.parse_rss(_SAMPLE_RSS, max_items=2)
    assert len(items) == 2
    assert items[1]["title"] == "Second headline"


def test_parse_rss_empty_channel() -> None:
    xml_text = "<rss version=\"2.0\"><channel><title>Empty</title></channel></rss>"
    assert state.parse_rss(xml_text, max_items=10) == []
