import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_arxiv_search_state"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_module()

_SAMPLE_FEED = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/1234.5678v1</id>
    <title>
  A Study of Quantum Widgets
</title>
    <summary>
  This paper studies quantum widgets in great detail.
</summary>
    <published>2026-01-01T00:00:00Z</published>
    <author><name>Ada Lovelace</name></author>
    <author><name>Alan Turing</name></author>
  </entry>
</feed>
"""


def test_parse_arxiv_feed_extracts_paper() -> None:
    papers = state.parse_arxiv_feed(_SAMPLE_FEED)
    assert len(papers) == 1
    paper = papers[0]
    assert paper["title"] == "A Study of Quantum Widgets"
    assert paper["url"] == "http://arxiv.org/abs/1234.5678v1"
    assert paper["authors"] == ["Ada Lovelace", "Alan Turing"]


def test_parse_arxiv_feed_empty() -> None:
    empty_feed = '<feed xmlns="http://www.w3.org/2005/Atom"></feed>'
    assert state.parse_arxiv_feed(empty_feed) == []
