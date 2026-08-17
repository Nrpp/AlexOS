import importlib.util
import sys
from pathlib import Path

import httpx
import pytest

_MODULE_NAME = "alexos_test_news_state"
_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_state():
    # state.py has no `app.*` imports, unlike most other modules' state.py -
    # loadable standalone, no apps/api-on-sys.path dance needed.
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _STATE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_state()

_SAMPLE_RSS = """<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Sample Feed</title>
    <item>
      <title>First headline</title>
      <link>https://example.com/1</link>
      <pubDate>Mon, 17 Aug 2026 09:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second headline</title>
      <link>https://example.com/2</link>
      <pubDate>Mon, 17 Aug 2026 08:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>"""


def test_parse_rss_extracts_title_link_and_pub_date() -> None:
    items = state.parse_rss(_SAMPLE_RSS, "Sample Feed", max_items=10)
    assert items == [
        {"feedName": "Sample Feed", "title": "First headline", "link": "https://example.com/1", "pubDate": "Mon, 17 Aug 2026 09:00:00 GMT"},
        {"feedName": "Sample Feed", "title": "Second headline", "link": "https://example.com/2", "pubDate": "Mon, 17 Aug 2026 08:00:00 GMT"},
    ]


def test_parse_rss_respects_max_items() -> None:
    items = state.parse_rss(_SAMPLE_RSS, "Sample Feed", max_items=1)
    assert len(items) == 1
    assert items[0]["title"] == "First headline"


@pytest.mark.asyncio
async def test_fetch_headlines_returns_empty_list_when_no_feeds_configured() -> None:
    state.configure({"feeds": []})
    assert await state.fetch_headlines() == []


@pytest.mark.asyncio
async def test_fetch_headlines_combines_multiple_feeds(monkeypatch) -> None:
    async def fake_get(self, url, **kwargs):
        return httpx.Response(200, text=_SAMPLE_RSS, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    state.configure({"feeds": [{"name": "A", "url": "https://a.example/rss"}, {"name": "B", "url": "https://b.example/rss"}], "maxItemsPerFeed": 6})

    headlines = await state.fetch_headlines()

    assert len(headlines) == 4  # 2 items x 2 feeds
    assert {h["feedName"] for h in headlines} == {"A", "B"}


@pytest.mark.asyncio
async def test_fetch_headlines_skips_a_failing_feed_without_failing_the_rest(monkeypatch) -> None:
    async def fake_get(self, url, **kwargs):
        if "bad" in url:
            raise httpx.ConnectError("boom", request=httpx.Request("GET", url))
        return httpx.Response(200, text=_SAMPLE_RSS, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    state.configure(
        {"feeds": [{"name": "Good", "url": "https://good.example/rss"}, {"name": "Bad", "url": "https://bad.example/rss"}], "maxItemsPerFeed": 6}
    )

    headlines = await state.fetch_headlines()

    assert len(headlines) == 2
    assert all(h["feedName"] == "Good" for h in headlines)
