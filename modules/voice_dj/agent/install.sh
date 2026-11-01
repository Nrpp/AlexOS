#!/usr/bin/env bash
# Sets up the voice_dj host agent on the Raspberry Pi:
#   1. a Python venv with Vosk
#   2. the small Spanish Vosk model
#   3. a systemctl --user service that runs the agent on boot
#
# Re-runnable (idempotent). Run it ON THE PI, as your normal user (NOT
# with sudo - it's a --user service and a venv in your home):
#
#   bash modules/voice_dj/agent/install.sh
#
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$AGENT_DIR/.venv"
MODEL_DIR="$AGENT_DIR/models/vosk-es"
MODEL_URL="https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT="$UNIT_DIR/voice-dj.service"

echo "==> voice_dj agent install"
echo "    agent dir: $AGENT_DIR"

# --- 1. Python venv -------------------------------------------------------
# Prefer an interpreter with the best Vosk wheel coverage on aarch64.
PYBIN=""
for cand in python3.11 python3.12 python3.13 python3; do
  if command -v "$cand" >/dev/null 2>&1; then PYBIN="$(command -v "$cand")"; break; fi
done
if [ -z "$PYBIN" ]; then echo "!! no python3 found"; exit 1; fi
echo "==> using $("$PYBIN" --version) at $PYBIN"

if [ ! -d "$VENV" ]; then
  "$PYBIN" -m venv "$VENV"
fi
"$VENV/bin/pip" install --upgrade pip >/dev/null
echo "==> installing Python deps (vosk)..."
if ! "$VENV/bin/pip" install -r "$AGENT_DIR/requirements.txt"; then
  echo "!! vosk didn't install for $("$PYBIN" --version)."
  echo "   Voice recognition will be disabled, but the agent still runs"
  echo "   (UI play/stop + radio work). Try a python3.11/3.12 venv, or:"
  echo "     $VENV/bin/pip install vosk"
fi

# --- 2. Vosk Spanish model ------------------------------------------------
if [ ! -d "$MODEL_DIR" ]; then
  echo "==> downloading Vosk small Spanish model (~45MB)..."
  tmp="$(mktemp -d)"
  if command -v wget >/dev/null 2>&1; then wget -q -O "$tmp/m.zip" "$MODEL_URL";
  else curl -fsSL -o "$tmp/m.zip" "$MODEL_URL"; fi
  unzip -q "$tmp/m.zip" -d "$tmp"
  mkdir -p "$(dirname "$MODEL_DIR")"
  mv "$tmp"/vosk-model-* "$MODEL_DIR"
  rm -rf "$tmp"
  echo "    model at $MODEL_DIR"
else
  echo "==> Vosk model already present"
fi

# --- 3. systemd --user service -------------------------------------------
mkdir -p "$UNIT_DIR"
# The agent shells out to pactl, parecord/pw-record, cvlc/ffplay,
# chromium and bluetoothctl. A systemd --user service gets a minimal
# PATH that often misses where some of these live (e.g. a Homebrew
# prefix), which silently breaks audio while Bluetooth still "connects".
# Bake the install-time PATH (plus the audio tools' own dir) into the
# unit so the service sees exactly what you see in your shell.
AUDIO_BIN="$(dirname "$(command -v pactl 2>/dev/null || command -v pw-record 2>/dev/null || echo /usr/bin/pactl)")"
cat > "$UNIT" <<EOF
[Unit]
Description=AlexOS voice_dj agent (wake word + music on the Bluetooth speaker)
After=pipewire.service wireplumber.service bluetooth.target graphical-session.target
Wants=pipewire.service wireplumber.service

[Service]
Type=simple
Environment=PATH=$AUDIO_BIN:$PATH
ExecStart=$VENV/bin/python $AGENT_DIR/listen.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF
echo "==> wrote $UNIT"

# Make the desktop session's display + PipeWire reachable to the service
# (needed for the mic, the speaker audio, and Chromium for Spotify).
systemctl --user import-environment WAYLAND_DISPLAY DISPLAY XDG_RUNTIME_DIR PULSE_SERVER 2>/dev/null || true
systemctl --user daemon-reload
systemctl --user enable voice-dj.service
# restart (not just `enable --now`, which won't restart an already-running
# instance) so a re-run always picks up unit/config changes.
systemctl --user restart voice-dj.service

echo ""
echo "==> done. The agent is running."
echo "    logs:    journalctl --user -u voice-dj -f"
echo "    restart: systemctl --user restart voice-dj"
echo "    stop:    systemctl --user stop voice-dj"
echo ""
echo "Make sure modules/voice_dj/config.json has your speaker's Bluetooth"
echo "address (or a nameMatch it can find), then say: \"Alex, pon musica\"."
