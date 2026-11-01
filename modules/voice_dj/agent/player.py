"""Music playback for the voice_dj agent, two sources:

  * "radio"   - an internet-radio stream (default: Radio Paradise) played
                by a lightweight CLI player (cvlc/ffplay). No account, no
                browser, no login. This is the path that works fully out
                of the box and is the safe default.

  * "spotify" - the Spotify WEB PLAYER in Chromium, for a *free* Spotify
                account (the Web API needs Premium, so we drive the UI
                instead). The USER logs in themselves once, into a
                persistent Chromium profile; we only open the playlist
                and try to press play. This needs the Pi's desktop
                session (a display) and is the nicer-but-fiddlier path.

Both route through PipeWire's default sink, which bt_audio points at the
Bluetooth speaker before we start, so whatever plays comes out of the
Moto Sound Flow."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
from pathlib import Path

log = logging.getLogger("voice_dj.player")

CHROMIUM_PROFILE_DIR = Path.home() / ".config" / "voice-dj-chromium"


class Player:
    def __init__(self, config: dict) -> None:
        music = config.get("music", {})
        self.radio_url: str = music.get("radioStreamUrl", "https://stream.radioparadise.com/mp3-128")
        self.radio_name: str = music.get("radioName", "Radio")
        self.spotify_url: str = music.get("spotifyPlaylistUrl", "")
        self._proc: subprocess.Popen | None = None
        self._source: str | None = None
        self._now_playing: str = ""

    @property
    def source(self) -> str | None:
        return self._source

    @property
    def now_playing(self) -> str:
        return self._now_playing

    @property
    def is_playing(self) -> bool:
        return self._proc is not None and self._proc.poll() is None

    # --- radio ------------------------------------------------------------

    def _radio_cmd(self) -> list[str] | None:
        if shutil.which("cvlc"):
            # dummy interface, no video, keep retrying a dropped stream.
            return ["cvlc", "--intf", "dummy", "--no-video", "--quiet", self.radio_url]
        if shutil.which("ffplay"):
            return ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", self.radio_url]
        return None

    def play_radio(self) -> tuple[bool, str]:
        self.stop()
        cmd = self._radio_cmd()
        if not cmd:
            return False, "no radio player found (install vlc or ffmpeg)"
        env = dict(os.environ)
        # ffplay uses SDL; make it use the Pulse/PipeWire backend so it
        # follows the default sink we point at the speaker.
        env.setdefault("SDL_AUDIODRIVER", "pulseaudio")
        try:
            self._proc = subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError as exc:
            return False, f"couldn't start radio player: {exc}"
        self._source = "radio"
        self._now_playing = self.radio_name
        log.info("radio started: %s", self.radio_name)
        return True, self.radio_name

    # --- spotify (web player in Chromium) ---------------------------------

    def _has_display(self) -> bool:
        return bool(os.environ.get("WAYLAND_DISPLAY") or os.environ.get("DISPLAY"))

    def _press_play_key(self) -> None:
        """Try to send a spacebar (Spotify's play/pause) to the focused
        Chromium. Best-effort across Wayland/X11 tools; silently skipped
        if none is present - the user can tap play on the touch screen."""
        for tool, args in (
            ("ydotool", ["ydotool", "key", "57:1", "57:0"]),  # 57 = KEY_SPACE
            ("wtype", ["wtype", " "]),
            ("xdotool", ["xdotool", "key", "space"]),
        ):
            if shutil.which(tool):
                try:
                    subprocess.run(args, timeout=5, check=False)
                    return
                except OSError:
                    pass

    def play_spotify(self) -> tuple[bool, str]:
        if not self.spotify_url:
            return False, "no Spotify playlist URL configured"
        if not shutil.which("chromium") and not shutil.which("chromium-browser"):
            return False, "chromium not installed"
        if not self._has_display():
            return False, "no desktop display for Chromium (Spotify needs the Pi's screen session)"
        self.stop()
        chromium = shutil.which("chromium") or shutil.which("chromium-browser")
        CHROMIUM_PROFILE_DIR.mkdir(parents=True, exist_ok=True)
        cmd = [
            chromium,
            f"--user-data-dir={CHROMIUM_PROFILE_DIR}",
            "--autoplay-policy=no-user-gesture-required",
            "--no-first-run",
            "--disable-features=Translate",
            f"--app={self.spotify_url}",
        ]
        try:
            self._proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError as exc:
            return False, f"couldn't start Chromium: {exc}"
        self._source = "spotify"
        self._now_playing = "Spotify"
        # Give the page a moment to load, then nudge play. Done by the
        # caller's loop timing in practice; a single attempt here helps.
        log.info("spotify web player opened")
        return True, "Spotify"

    def nudge_play(self) -> None:
        if self._source == "spotify" and self.is_playing:
            self._press_play_key()

    # --- stop -------------------------------------------------------------

    def stop(self) -> None:
        if self._proc is not None and self._proc.poll() is None:
            self._proc.terminate()
            try:
                self._proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._proc.kill()
        self._proc = None
        self._source = None
        self._now_playing = ""
