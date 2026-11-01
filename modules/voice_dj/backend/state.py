"""In-memory state for the voice_dj module.

The real work - listening on the Bluetooth mic, wake-word detection,
Spanish speech recognition, switching the speaker between A2DP and HFP,
and driving the Spotify web player in Chromium - all happens in a
HOST-side agent process (see modules/voice_dj/agent/), NOT in here. The
AlexOS backend runs inside the Docker `api` container, which can't reach
the Pi's microphone, PipeWire, or a desktop Chromium; the agent runs on
the host where all of that lives.

This module is the AlexOS-facing surface for that agent:

  * the agent POSTs its status here (`/heartbeat`) and the intents it
    recognises (`/intent`), which we republish on the Core Event Bus so
    the rest of AlexOS (and the widget) can react;
  * the widget enqueues manual commands here (`/play`, `/stop`) which the
    agent picks up by polling (`/commands`).

So this file holds only: the last status the agent reported, and a small
queue of commands waiting for the agent to collect. No audio, no SQL -
just a thin, restart-tolerant rendezvous point."""

from __future__ import annotations

import itertools
import time
from typing import Any

# If the agent hasn't checked in within this long, we treat it as
# offline - the widget then shows "agent not running" instead of a stale
# "listening". Comfortably longer than the agent's own heartbeat period
# (see agent/config defaults) so a single missed beat doesn't flap.
AGENT_OFFLINE_AFTER_SECONDS = 15.0


class VoiceDJState:
    def __init__(self) -> None:
        self._last_heartbeat: float = 0.0
        # Mirrors the agent's last reported status. "idle" = agent up but
        # doing nothing, "listening" = waiting for the wake word / a
        # command, "playing" = music is out over the speaker.
        self.mode: str = "idle"
        self.source: str | None = None  # "spotify" | "radio" | None
        self.speaker_connected: bool = False
        self.last_heard: str = ""  # last transcript the agent recognised
        self.now_playing: str = ""  # free-text, e.g. "Radio Paradise" or a track
        self.detail: str = ""  # optional status/error line from the agent
        self._commands: list[dict[str, Any]] = []
        self._command_ids = itertools.count(1)

    # --- agent status -----------------------------------------------------

    @property
    def agent_online(self) -> bool:
        return (time.monotonic() - self._last_heartbeat) < AGENT_OFFLINE_AFTER_SECONDS

    def update_from_agent(self, payload: dict[str, Any]) -> None:
        self._last_heartbeat = time.monotonic()
        if "mode" in payload:
            self.mode = str(payload["mode"])
        if "source" in payload:
            self.source = payload["source"] or None
        if "speakerConnected" in payload:
            self.speaker_connected = bool(payload["speakerConnected"])
        if "lastHeard" in payload and payload["lastHeard"]:
            self.last_heard = str(payload["lastHeard"])
        if "nowPlaying" in payload:
            self.now_playing = str(payload["nowPlaying"] or "")
        if "detail" in payload:
            self.detail = str(payload["detail"] or "")

    # --- command queue (UI -> agent) --------------------------------------

    def enqueue_command(self, action: str, source: str | None = None) -> dict[str, Any]:
        command = {"id": next(self._command_ids), "action": action, "source": source}
        self._commands.append(command)
        return command

    def drain_commands(self) -> list[dict[str, Any]]:
        """Returns all pending commands and clears the queue - the agent
        polls this, so each command is handed out exactly once."""
        pending, self._commands = self._commands, []
        return pending

    # --- public view (for the widget / event bus) -------------------------

    def to_payload(self) -> dict[str, Any]:
        return {
            "agentOnline": self.agent_online,
            "mode": self.mode if self.agent_online else "offline",
            "source": self.source,
            "speakerConnected": self.speaker_connected,
            "lastHeard": self.last_heard,
            "nowPlaying": self.now_playing,
            "detail": self.detail,
        }


state = VoiceDJState()
