"""Mock media player. See the module README for what a real Spotify
connection would replace here."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class Track:
    title: str
    artist: str
    duration_seconds: int = 210


_DEFAULT_PLAYLIST = [
    Track("Sunset Drive", "Night Cassette", 210),
    Track("Blue Hour", "Aurora Fields", 185),
    Track("Static & Stars", "Halide", 240),
]


def state_to_payload(player: "MockPlayer") -> dict[str, Any]:
    track = player.playlist[player.index]
    return {
        "title": track.title,
        "artist": track.artist,
        "durationSeconds": track.duration_seconds,
        "positionSeconds": player.position_seconds,
        "isPlaying": player.is_playing,
    }


class MockPlayer:
    def __init__(self) -> None:
        self.playlist: list[Track] = _DEFAULT_PLAYLIST
        self.index = 0
        self.position_seconds = 0
        self.is_playing = False

    def configure(self, config: dict[str, Any]) -> None:
        seeded = config.get("playlist")
        if not seeded:
            return
        self.playlist = [
            Track(entry["title"], entry["artist"], entry.get("durationSeconds", 210)) for entry in seeded
        ]

    def play(self) -> None:
        self.is_playing = True

    def pause(self) -> None:
        self.is_playing = False

    def next(self) -> None:
        self.index = (self.index + 1) % len(self.playlist)
        self.position_seconds = 0

    def previous(self) -> None:
        self.index = (self.index - 1) % len(self.playlist)
        self.position_seconds = 0

    def tick(self) -> bool:
        """Advances playback by one second. Returns True if state changed."""
        if not self.is_playing:
            return False
        track = self.playlist[self.index]
        self.position_seconds += 1
        if self.position_seconds >= track.duration_seconds:
            self.next()
        return True


player = MockPlayer()
