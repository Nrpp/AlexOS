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
import threading
import time
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

    def _audio_flowing(self) -> bool:
        """True if a Bluetooth output sink is actively playing (RUNNING).
        Used to know when Spotify has actually started, so we stop poking
        the play key (space toggles play/pause - we must press it exactly
        until it starts, never again, or we'd pause it)."""
        try:
            out = subprocess.run(
                ["pactl", "list", "sinks", "short"], capture_output=True, text=True, timeout=5
            ).stdout
        except (OSError, subprocess.SubprocessError):
            return False
        return any("bluez_output" in line and "RUNNING" in line for line in out.splitlines())

    def _player_window(self) -> str | None:
        """The Chromium window id of the actual Spotify player. In --app
        mode its title is the playlist/track name (e.g. a song title),
        NOT the literal "chromium" that blank/helper windows carry - so
        we pick the first chromium window whose title is something real.
        Requires X11/XWayland (we launch Chromium --ozone-platform=x11);
        a native-Wayland window is invisible to xdotool."""
        try:
            ids = subprocess.run(
                ["xdotool", "search", "--class", "chromium"], capture_output=True, text=True, timeout=5
            ).stdout.split()
        except (OSError, subprocess.SubprocessError):
            return None
        for wid in ids:
            try:
                name = subprocess.run(
                    ["xdotool", "getwindowname", wid], capture_output=True, text=True, timeout=5
                ).stdout.strip()
            except (OSError, subprocess.SubprocessError):
                continue
            # A real page title (playlist/track name) = the player window.
            # Blank/helper windows are titled literally "chromium"; never
            # press those - pressing a non-player window does nothing, and
            # pressing before the track is cued just wastes a toggle.
            if name and name.lower() != "chromium":
                return wid
        return None

    def _press_play(self) -> None:
        """Press the Spotify web player's play/pause (spacebar) on the
        player window."""
        if not shutil.which("xdotool"):
            return
        wid = self._player_window()
        if not wid:
            return
        try:
            subprocess.run(["xdotool", "windowactivate", "--sync", wid], timeout=5, check=False)
            subprocess.run(["xdotool", "key", "--window", wid, "space"], timeout=5, check=False)
        except (OSError, subprocess.SubprocessError):
            pass

    def _spotify_autostart(self) -> None:
        """Wait for the page to load, then press play until audio actually
        starts (or we give up). Runs in its own thread so it doesn't block
        the agent loop, and presses space only while NOT yet playing - so
        it never pauses a stream that already started."""
        time.sleep(10)  # Spotify web player is slow to load on a Pi
        for _ in range(20):
            if self._source != "spotify" or not self.is_playing:
                return  # stopped/switched while we waited
            if self._audio_flowing():
                log.info("spotify playback started")
                return
            # Only presses once a real player window (a cued track/
            # playlist title) exists; otherwise waits for it to load.
            self._press_play()
            time.sleep(3)

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
            # X11 so xdotool can focus the window and press play; a native
            # Wayland window can't be driven by any tool we have here.
            "--ozone-platform=x11",
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
        threading.Thread(target=self._spotify_autostart, daemon=True).start()
        log.info("spotify web player opened")
        return True, "Spotify"

    def nudge_play(self) -> None:
        # Autostart is handled by the _spotify_autostart thread now; kept
        # as a no-op so existing loop calls stay harmless (pressing space
        # on a loop would toggle pause).
        return

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
