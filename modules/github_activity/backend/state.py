"""Real recent activity via GitHub's public REST API - no API key
needed for public data (rate-limited to 60 requests/hour per IP
without one; fine for a widget a person glances at occasionally)."""

from __future__ import annotations

from typing import Any

import httpx

_API_BASE = "https://api.github.com"

_EVENT_DESCRIPTIONS = {
    "PushEvent": "pushed to",
    "CreateEvent": "created",
    "WatchEvent": "starred",
    "ForkEvent": "forked",
    "IssuesEvent": "opened an issue on",
    "PullRequestEvent": "opened a pull request on",
    "IssueCommentEvent": "commented on",
    "PublicEvent": "made public",
}


def describe_event(event: dict[str, Any]) -> dict[str, Any]:
    event_type = event.get("type", "")
    repo_name = event.get("repo", {}).get("name", "")
    verb = _EVENT_DESCRIPTIONS.get(event_type, event_type)
    return {"description": f"{verb} {repo_name}".strip(), "repo": repo_name, "createdAt": event.get("created_at")}


class GitHubActivityProvider:
    def __init__(self) -> None:
        self.username = ""

    def configure(self, config: dict[str, Any]) -> None:
        self.username = config.get("username", "")

    async def list_recent_events(self, limit: int = 10) -> list[dict[str, Any]] | None:
        """None means no username configured - distinct from a user with no public activity."""
        if not self.username:
            return None
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{_API_BASE}/users/{self.username}/events/public",
                params={"per_page": limit},
                headers={"User-Agent": "AlexOS", "Accept": "application/vnd.github+json"},
            )
            response.raise_for_status()
            events = response.json()
        return [describe_event(event) for event in events[:limit]]


provider = GitHubActivityProvider()
