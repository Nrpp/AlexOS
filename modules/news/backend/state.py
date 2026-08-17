"""On-demand headlines from a small set of curated RSS feeds - fetched
fresh every time GET /headlines is called (no background polling, no
cache), matching "tell me today's news when I ask, not continuously."

RSS parsing (xml.etree.ElementTree, standard library) is the same
approach as modules/rss_reader (duplicated, not shared - modules are
independently loaded), just wrapped to fetch several curated feeds at
once and label each item with which feed it came from."""

from __future__ import annotations

import asyncio
import xml.etree.ElementTree as ElementTree
from typing import Any

import httpx

_feeds: list[dict[str, str]] = []
_max_items_per_feed = 6


def configure(config: dict[str, Any]) -> None:
    global _feeds, _max_items_per_feed
    _feeds = config.get("feeds", _feeds)
    _max_items_per_feed = config.get("maxItemsPerFeed", _max_items_per_feed)


def parse_rss(xml_text: str, feed_name: str, max_items: int) -> list[dict[str, str]]:
    root = ElementTree.fromstring(xml_text)
    items = []
    for item in root.findall("./channel/item")[:max_items]:
        title = item.findtext("title", default="").strip()
        link = item.findtext("link", default="").strip()
        pub_date = item.findtext("pubDate", default="").strip()
        items.append({"feedName": feed_name, "title": title, "link": link, "pubDate": pub_date})
    return items


async def _fetch_one_feed(client: httpx.AsyncClient, feed: dict[str, str]) -> list[dict[str, str]]:
    response = await client.get(feed["url"])
    response.raise_for_status()
    return parse_rss(response.text, feed["name"], _max_items_per_feed)


async def fetch_headlines() -> list[dict[str, str]]:
    if not _feeds:
        return []
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        results = await asyncio.gather(
            *(_fetch_one_feed(client, feed) for feed in _feeds), return_exceptions=True
        )
    headlines: list[dict[str, str]] = []
    for result in results:
        if isinstance(result, Exception):
            continue  # one feed failing shouldn't take the others down
        headlines.extend(result)
    return headlines
