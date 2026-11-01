#!/usr/bin/env python3
"""voice_dj host agent - the part that actually listens and plays.

Runs on the Raspberry Pi HOST (as a `systemctl --user` service), not in
the AlexOS Docker container, because only the host can reach the
microphone, PipeWire and the desktop Chromium. It:

  1. connects the Moto Sound Flow over Bluetooth,
  2. in the HFP (mic) profile, listens for "Alex, pon musica" with Vosk,
  3. on the command, switches the speaker to A2DP and plays music
     (internet radio by default, or the Spotify web player),
  4. reports status + recognised intents to the AlexOS voice_dj module
     over HTTP, so the Core Event Bus and the widget stay in sync,
  5. picks up manual play/stop commands the widget queues.

The A2DP<->HFP switch is explicit and one-way-at-a-time on purpose: a
classic BT speaker can't do hi-fi output and the mic at once, so the
agent listens OR plays, never both (see bt_audio.py). Stop playback from
the widget's "Parar" button (or by config timeout) to return to
listening.

Config comes from ../config.json (the module's own config). No secrets
live here - the Spotify login is done by the user in the browser, never
handled by this agent."""

from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from bt_audio import ensure_connected, find_address_by_name, is_connected, mic_source_name, use_mic_profile, use_music_profile
from player import Player
from recognizer import Recognizer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("voice_dj.agent")

AGENT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = AGENT_DIR.parent / "config.json"
# Where install.sh puts the Vosk Spanish model.
MODEL_PATH = Path(os.environ.get("VOSK_MODEL_PATH", AGENT_DIR / "models" / "vosk-es"))


def load_config() -> dict:
    try:
        return json.loads(CONFIG_PATH.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        log.warning("couldn't read config.json (%s) - using defaults", exc)
        return {}


class AgentAPI:
    """Thin client for the module's router, stdlib-only (no extra deps)."""

    def __init__(self, base_url: str) -> None:
        self.base = base_url.rstrip("/") + "/api/v1/modules/voice_dj"

    def _post(self, path: str, body: dict) -> dict | None:
        data = json.dumps(body).encode()
        req = urllib.request.Request(
            f"{self.base}{path}", data=data, headers={"Content-Type": "application/json"}, method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read() or b"{}")
        except (urllib.error.URLError, OSError, json.JSONDecodeError) as exc:
            log.debug("POST %s failed: %s", path, exc)
            return None

    def heartbeat(self, **fields) -> None:
        self._post("/heartbeat", fields)

    def intent(self, intent: str, text: str = "") -> None:
        self._post("/intent", {"intent": intent, "text": text})

    def poll_commands(self) -> list[dict]:
        try:
            with urllib.request.urlopen(f"{self.base}/commands", timeout=5) as resp:
                return json.loads(resp.read() or b"{}").get("commands", [])
        except (urllib.error.URLError, OSError, json.JSONDecodeError):
            return []


class Agent:
    def __init__(self) -> None:
        self.config = load_config()
        self.api = AgentAPI(self.config.get("agent", {}).get("apiBaseUrl", "http://localhost:8000"))
        self.player = Player(self.config)
        self.default_source = self.config.get("music", {}).get("source", "radio")
        agent_cfg = self.config.get("agent", {})
        self.heartbeat_s = float(agent_cfg.get("heartbeatSeconds", 5))
        self.command_poll_s = float(agent_cfg.get("commandPollSeconds", 2))

        speaker = self.config.get("speaker", {})
        self.address = speaker.get("address") or None
        self.name_match = speaker.get("nameMatch", "sound flow")

        # Optional external mic (e.g. a USB mic). When set we listen on it
        # directly and never touch the speaker's HFP profile - so there's
        # no A2DP<->HFP conflict and we can hear "para" even while playing.
        self.mic_source = self.config.get("voice", {}).get("micSource") or None

        self.recognizer: Recognizer | None = None
        self.voice_detail = ""
        self._init_recognizer()

        self.mode = "listening"  # or "playing"
        self._last_heartbeat = 0.0
        self._last_poll = 0.0

    def _init_recognizer(self) -> None:
        if not MODEL_PATH.exists():
            self.voice_detail = "modelo de voz no instalado (ejecuta install.sh)"
            log.warning("Vosk model not found at %s - voice disabled, UI controls still work", MODEL_PATH)
            return
        try:
            rec = Recognizer(str(MODEL_PATH), self.config.get("wakeWord", "alex"), self.config.get("commands", {}))
            rec.load()
            self.recognizer = rec
        except Exception as exc:  # vosk missing or model unreadable
            self.voice_detail = f"voz no disponible: {exc}"
            log.warning("recognizer unavailable (%s) - voice disabled, UI controls still work", exc)

    # --- speaker ----------------------------------------------------------

    def ensure_speaker(self) -> bool:
        if not self.address:
            log.info("no speaker address in config - scanning for '%s'", self.name_match)
            self.address = find_address_by_name(self.name_match)
            if not self.address:
                return False
            log.info("found speaker at %s", self.address)
        return ensure_connected(self.address)

    # --- heartbeat / commands --------------------------------------------

    def _push_heartbeat(self, connected: bool | None = None) -> None:
        if connected is None:
            connected = bool(self.address and is_connected(self.address))
        self.api.heartbeat(
            # "" (not None) so a cleared source is actually transmitted:
            # the router drops null fields (exclude_none), and "" maps
            # back to None there - otherwise a stale source lingers.
            mode=self.mode,
            source=self.player.source or "",
            speakerConnected=connected,
            nowPlaying=self.player.now_playing,
            detail=self.voice_detail,
        )
        self._last_heartbeat = time.monotonic()

    def _beat(self) -> None:
        if time.monotonic() - self._last_heartbeat >= self.heartbeat_s:
            self._push_heartbeat()

    def _commands(self) -> list[dict]:
        now = time.monotonic()
        if now - self._last_poll >= self.command_poll_s:
            self._last_poll = now
            return self.api.poll_commands()
        return []

    # --- transitions ------------------------------------------------------

    def start_playing(self, source: str | None, spoken_text: str = "") -> None:
        source = source or self.default_source
        # With an external mic there's no profile conflict, so keep
        # capturing while we play. Only the speaker-HFP path has to stop
        # listening to free the link for A2DP.
        if self.recognizer and not self.mic_source:
            self.recognizer.stop_capture()
        if self.address and not use_music_profile(self.address)[0]:
            log.warning("couldn't switch speaker to A2DP; trying to play anyway")
        if source == "spotify":
            ok, detail = self.player.play_spotify()
            if not ok:
                log.warning("spotify failed (%s) - falling back to radio", detail)
                ok, detail = self.player.play_radio()
        else:
            ok, detail = self.player.play_radio()
        if ok:
            self.mode = "playing"
            self.api.intent("play_music", spoken_text)
            log.info("playing %s (%s)", self.player.source, detail)
        else:
            self.voice_detail = f"no pude reproducir: {detail}"
            log.error("playback failed: %s", detail)
        self._push_heartbeat()  # reflect the new state in the UI at once

    def stop_playing(self, spoken_text: str = "") -> None:
        self.player.stop()
        self.mode = "listening"
        self.api.intent("stop", spoken_text)
        self._push_heartbeat()  # reflect "listening" in the UI at once

    # --- main loop --------------------------------------------------------

    def run(self) -> None:
        log.info("voice_dj agent starting (default source: %s)", self.default_source)
        while True:
            try:
                self._loop_once()
            except KeyboardInterrupt:
                break
            except Exception:
                log.exception("loop error")
                time.sleep(2)
        self.player.stop()
        if self.recognizer:
            self.recognizer.stop_capture()

    def _loop_once(self) -> None:
        connected = self.ensure_speaker()
        self._beat()

        for cmd in self._commands():
            if cmd.get("action") == "play":
                self.start_playing(cmd.get("source"))
            elif cmd.get("action") == "stop":
                self.stop_playing()

        if self.mic_source:
            self._loop_external_mic(connected)
            return

        if self.mode == "playing":
            # Hardware can't give us the mic while playing hi-fi, so we
            # don't listen here - we just watch the player and wait for a
            # stop command. If the stream died on its own, go back to
            # listening.
            if not self.player.is_playing:
                log.info("playback ended on its own - back to listening")
                self.stop_playing()
            self.player.nudge_play()
            time.sleep(1)
            return

        # mode == "listening"
        if not connected:
            self.voice_detail = "altavoz no conectado"
            time.sleep(3)
            return

        if not self.recognizer:
            time.sleep(self.command_poll_s)  # UI-only mode
            return

        ok, source = use_mic_profile(self.address)
        if not ok:
            self.voice_detail = f"sin microfono: {source}"
            time.sleep(3)
            return
        self.voice_detail = ""
        if self.recognizer._capture is None:
            if not self.recognizer.start_capture(mic_source_name(self.address)):
                self.voice_detail = "no pude capturar del microfono"
                time.sleep(3)
                return

        text, intent = self.recognizer.listen_once()
        if text:
            log.info("heard: %r -> %s", text, intent)
            self.api.heartbeat(lastHeard=text, mode=self.mode, speakerConnected=connected)
        if intent == "play":
            self.start_playing(None, text)
        elif intent == "stop":
            self.stop_playing(text)

    def _loop_external_mic(self, connected: bool) -> None:
        """External-mic mode: no A2DP<->HFP juggling. We keep the speaker
        on A2DP for output and listen on the configured mic the whole
        time, so "Alex, pon musica" AND "Alex, para" both work even while
        music is playing."""
        if self.mode == "playing" and not self.player.is_playing:
            self.stop_playing()  # stream ended on its own
        if self.mode == "playing":
            self.player.nudge_play()
        if not self.recognizer:
            time.sleep(self.command_poll_s)  # UI-only mode
            return
        if self.recognizer._capture is None:
            if not self.recognizer.start_capture(self.mic_source):
                self.voice_detail = "no pude capturar del microfono"
                time.sleep(3)
                return
            self.voice_detail = ""
        text, intent = self.recognizer.listen_once()
        if text:
            log.info("heard: %r -> %s", text, intent)
            self.api.heartbeat(lastHeard=text, mode=self.mode, speakerConnected=connected)
        if intent == "play" and self.mode != "playing":
            self.start_playing(None, text)
        elif intent == "stop":
            self.stop_playing(text)


if __name__ == "__main__":
    Agent().run()
