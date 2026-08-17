# News

Powers the News page's headlines card.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/news/headlines` fetches
  every feed in `config.json`'s `feeds` list fresh, on that request -
  no background polling, no cache. One feed failing (network error,
  bad XML, ...) doesn't take the others down with it.
- **Frontend** (`frontend/index.tsx`): a `NewsWidget` with a "Get
  today's news" button rather than auto-refreshing state - matches
  "tell me the news when I ask," not a ticker.

## Default feed, and why

`config.json` ships with BBC Mundo
(`https://feeds.bbci.co.uk/mundo/rss.xml`) - no API key needed (RSS is
just XML over HTTP), Spanish-language, and already the same technology
`modules/rss_reader` trusts (its own default is BBC News' English feed).
Real-time general-news APIs (NewsAPI, GNews, ...) mostly require a paid
key or block non-localhost/commercial use on their free tier - RSS from
an established outlet's own public feed avoids that entirely.

Add more feeds by adding `{"name": "...", "url": "..."}` entries to
`config.json`'s `feeds` array - any standard RSS 2.0 feed works.
