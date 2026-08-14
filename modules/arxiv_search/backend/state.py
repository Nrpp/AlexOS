"""Real arXiv paper search via arXiv's public API - free, no API key.
Returns Atom XML, parsed with the standard library (same pattern as
modules/rss_reader) - no new dependency needed."""

from __future__ import annotations

import xml.etree.ElementTree as ElementTree
from typing import Any

_ATOM_NS = "{http://www.w3.org/2005/Atom}"


def parse_arxiv_feed(xml_text: str) -> list[dict[str, Any]]:
    root = ElementTree.fromstring(xml_text)
    papers = []
    for entry in root.findall(f"{_ATOM_NS}entry"):
        title = (entry.findtext(f"{_ATOM_NS}title", default="") or "").strip().replace("\n", " ")
        summary = (entry.findtext(f"{_ATOM_NS}summary", default="") or "").strip().replace("\n", " ")
        link = entry.findtext(f"{_ATOM_NS}id", default="") or ""
        authors = [
            (author.findtext(f"{_ATOM_NS}name", default="") or "").strip()
            for author in entry.findall(f"{_ATOM_NS}author")
        ]
        published = entry.findtext(f"{_ATOM_NS}published", default="") or ""
        papers.append(
            {
                "title": title,
                "summary": summary[:400],
                "url": link,
                "authors": authors,
                "published": published,
            }
        )
    return papers
