"""Offline Spanish speech recognition for the voice_dj agent, using Vosk.

Deliberately Vosk-only, no openWakeWord/Porcupine: on a Pi 4 (aarch64,
recent Python) the wake-word libraries drag in onnxruntime / tflite,
whose prebuilt wheels are the fragile part of the install. Vosk ships
clean aarch64 wheels and a ~45MB small Spanish model, and with a
restricted grammar it does keyword spotting well enough to act as both
the wake word ("alex") and the command recogniser ("pon musica"). That's
the "easiest that works" the brief asked for.

Audio is captured with `parecord`/`pw-record` (PipeWire) piped as raw
16kHz mono PCM straight into Vosk - no PortAudio/sounddevice wheel to
build. The capture reads from whatever bt_audio set as the default
source (the speaker's HFP mic), or an explicit source if given."""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
import unicodedata

log = logging.getLogger("voice_dj.recognizer")

SAMPLE_RATE = 16000


def _strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def normalize(text: str) -> str:
    return _strip_accents(text.lower()).strip()


class Recognizer:
    def __init__(self, model_path: str, wake_word: str, phrases: dict[str, list[str]]) -> None:
        self.model_path = model_path
        self.wake_word = normalize(wake_word)
        # phrases: {"play": [...], "stop": [...]} -> normalised lookup.
        self.phrases = {intent: [normalize(p) for p in plist] for intent, plist in phrases.items()}
        self._model = None
        self._capture: subprocess.Popen | None = None

    # Build the grammar Vosk is allowed to output: the wake word plus
    # every word that appears in any command phrase. A tight grammar is
    # what makes a small model reliable at spotting these exact phrases.
    def _grammar(self) -> str:
        words: set[str] = {self.wake_word}
        for plist in self.phrases.values():
            for phrase in plist:
                words.update(phrase.split())
        words.add("[unk]")
        return json.dumps(sorted(words))

    def load(self) -> None:
        from vosk import KaldiRecognizer, Model  # imported lazily so the

        # rest of the agent runs even if Vosk isn't installed yet.
        self._model = Model(self.model_path)
        self._recognizer = KaldiRecognizer(self._model, SAMPLE_RATE, self._grammar())
        log.info("Vosk model loaded from %s", self.model_path)

    def _capture_cmd(self, source: str | None) -> list[str] | None:
        if shutil.which("parecord"):
            cmd = ["parecord", "--rate=16000", "--channels=1", "--format=s16le", "--raw"]
            if source:
                cmd.append(f"--device={source}")
            return cmd
        if shutil.which("pw-record"):
            cmd = ["pw-record", "--rate=16000", "--channels=1", "--format=s16", "-"]
            if source:
                cmd[-1:-1] = [f"--target={source}"]
            return cmd
        return None

    def start_capture(self, source: str | None = None) -> bool:
        self.stop_capture()
        cmd = self._capture_cmd(source)
        if not cmd:
            log.error("no PipeWire capture tool (parecord/pw-record) found")
            return False
        self._capture = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
        return True

    def stop_capture(self) -> None:
        if self._capture is not None:
            self._capture.terminate()
            try:
                self._capture.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._capture.kill()
            self._capture = None

    def intent_from_text(self, text: str) -> str | None:
        """Does this transcript contain the wake word AND a command
        phrase? Returns the intent ("play"/"stop") or None."""
        t = normalize(text)
        if self.wake_word and self.wake_word not in t:
            return None
        # Check "stop" before "play": a stop phrase like "para la musica"
        # also contains "musica", so a generic play phrase must never win
        # over an explicit stop. Fixed order, not dict order.
        for intent in ("stop", "play"):
            for phrase in self.phrases.get(intent, []):
                if phrase and phrase in t:
                    return intent
        return None

    def listen_once(self, timeout_chunks: int = 250) -> tuple[str, str | None]:
        """Reads mic audio until Vosk returns a final result, then maps
        it to an intent. Returns (transcript, intent|None). Blocks; call
        it from the agent's listen loop. `timeout_chunks` bounds how long
        one utterance window waits so the loop can breathe."""
        if self._capture is None or self._capture.stdout is None:
            return "", None
        for _ in range(timeout_chunks):
            data = self._capture.stdout.read(4000)
            if not data:
                break
            if self._recognizer.AcceptWaveform(data):
                text = json.loads(self._recognizer.Result()).get("text", "")
                if text:
                    return text, self.intent_from_text(text)
        # Flush whatever partial we have at the window's end.
        text = json.loads(self._recognizer.FinalResult()).get("text", "")
        return text, self.intent_from_text(text) if text else None
