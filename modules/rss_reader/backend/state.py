"""Generic RSS 2.0 feed reader, using the standard library's
xml.etree.ElementTree - no new dependency needed just to read
<title>/<link>/<pubDate> out of an <item> list."""

from __future__ import annotations

import xml.etree.ElementTree as ElementTree
from typing import Any

import httpx


def parse_rss(xml_text: str, max_items: int) -> list[dict[str, str]]:
    root = ElementTree.fromstring(xml_text)
    items = []
    for item in root.findall("./channel/item")[:max_items]:
        title = item.findtext("title", default="").strip()
        link = item.findtext("link", default="").strip()
        pub_date = item.findtext("pubDate", default="").strip()
        items.append({"title": title, "link": link, "pubDate": pub_date})
    return items


class RssFeedProvider:
    def __init__(self) -> None:
        self.feed_url = ""
        self.max_items = 8

    def configure(self, config: dict[str, Any]) -> None:
        self.feed_url = config.get("feedUrl", self.feed_url)
        self.max_items = config.get("maxItems", self.max_items)

    async def list_headlines(self) -> list[dict[str, str]] | None:
        """None means no feed URL configured."""
        if not self.feed_url:
            return None
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(self.feed_url)
            response.raise_for_status()
        return parse_rss(response.text, self.max_items)


provider = RssFeedProvider()
