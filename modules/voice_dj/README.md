# voice_dj — DIY voice DJ in Spanish

Say **"Alex, pon música"** and the Raspberry Pi plays music out of the
Motorola **Moto Sound Flow** Bluetooth speaker — and it hears you through
that *same* speaker's microphone. A homemade Google-Home-style flow, all
on the Pi, in Spanish.

## How it's split (and why)

AlexOS's backend runs inside the Docker `api` container, which **can't
reach the Pi's microphone, PipeWire, or the desktop Chromium**. All of
that lives on the host. So voice_dj has two parts:

| Part | Where | Does |
|---|---|---|
| **Module** (this folder's `backend/`, `frontend/`) | Docker `api` container | AlexOS-facing surface: status, the `/play` `/stop` buttons, and publishing `voice_dj.intent` / `voice_dj.state` on the Core Event Bus. |
| **Host agent** (`agent/`) | Pi host, `systemctl --user` service | The real work: Bluetooth, the mic, Vosk speech recognition, the A2DP↔HFP switch, and playing music. |

The agent talks to the module over HTTP (`/heartbeat`, `/intent`,
`/commands`), so a recognised "pon música" becomes a first-class AlexOS
event, and the widget reflects what the agent is doing live.

```
  mic (HFP) ──▶ Vosk "Alex, pon música" ──▶ agent ──POST /intent──▶ module ──▶ Event Bus
                                              │
                                              └─▶ switch speaker to A2DP ─▶ play radio / Spotify ─▶ 🔊
```

## The one hardware rule this is designed around

A classic-Bluetooth speaker **cannot do hi-fi A2DP output and the
Hands-Free (HFP) microphone at the same time** — they're mutually
exclusive PipeWire profiles. So the agent **listens, then plays**: it's
in the mic (HFP) profile waiting for you, and only switches to A2DP once
it hears the command. **While music is playing it can't hear you** — stop
it with the widget's **Parar** button (or let a track/stream end). This
is a hardware limit, not a bug.

## Setup

### 1. Deploy the module (Docker)
The module is just files under `modules/`; rebuild the stack to pick it
up (same as any module — see `docs/INSTALL_RPI5.md`):
```bash
cd ~/AlexOS
docker compose --env-file .env -f docker/docker-compose.yml up -d --build
```

### 2. Pair the speaker
Put the Moto Sound Flow into Bluetooth pairing mode. Either pair it from
the Control Center module's Bluetooth UI, or let the agent find it by
name. Then put its address in `config.json` (recommended — faster and
unambiguous):
```json
"speaker": { "address": "AA:BB:CC:DD:EE:FF", "nameMatch": "sound flow" }
```
With no `address`, the agent scans for a device whose name contains
`nameMatch`.

### 3. Install the host agent
On the Pi, as your normal user (**not** sudo):
```bash
bash modules/voice_dj/agent/install.sh
```
This makes a Python venv, installs **Vosk**, downloads the small Spanish
model (~45 MB), and installs+starts a `systemctl --user` service. Check
it:
```bash
journalctl --user -u voice-dj -f
```

### 4. (Optional) Spotify, free account
The default music source is **internet radio** (`music.source: "radio"` →
Radio Paradise), which needs no login and works out of the box. To use
Spotify instead (`"source": "spotify"` in `config.json`):

- Spotify is driven through the **web player in Chromium**, because the
  Spotify Web API needs Premium and this is a **free** account.
- **You log in yourself, once.** On the Pi's desktop, open the profile
  the agent uses and sign in — nothing here ever sees your credentials:
  ```bash
  chromium --user-data-dir=~/.config/voice-dj-chromium https://open.spotify.com
  ```
  Log in, then close it. The login sticks in that profile.
- Set `music.spotifyPlaylistUrl` to a playlist. On "pon música" the agent
  opens it and tries to press play (space). Free-tier limits apply
  (shuffle, ads), and you may need to tap play once on the touch screen
  the first time. Radio is the dependable fallback — if Spotify can't
  start, the agent falls back to radio automatically.

## config.json

```jsonc
{
  "speaker":  { "address": "", "nameMatch": "sound flow" },
  "wakeWord": "alex",
  "commands": {
    "play": ["pon musica", "reproduce musica", "música", ...],
    "stop": ["para", "detente", "silencio", ...]
  },
  "music": {
    "source": "radio",                 // "radio" | "spotify"
    "spotifyPlaylistUrl": "https://open.spotify.com/playlist/...",
    "radioStreamUrl": "https://stream.radioparadise.com/mp3-128",
    "radioName": "Radio Paradise"
  },
  "agent": { "apiBaseUrl": "http://localhost:8000", "heartbeatSeconds": 5, "commandPollSeconds": 2 }
}
```

## Secrets

**None.** The agent handles no credentials: Spotify login is done by you
in the browser and stays in Chromium's own profile; radio needs no auth.
Everything configurable lives in `config.json` (committed, non-secret) —
so there are no `voice_dj` entries in `.env.example`.

## Events on the Core Event Bus

- `voice_dj.state` (retained) — full status for the widget: `mode`
  (`offline`/`idle`/`listening`/`playing`), `source`, `speakerConnected`,
  `lastHeard`, `nowPlaying`.
- `voice_dj.intent` — `{ intent: "play_music" | "stop", text }` whenever
  a spoken command is recognised. Any module can subscribe.

## Why Vosk-only (no openWakeWord/Porcupine)

On a Pi 4 the wake-word libraries pull in onnxruntime/tflite, whose
aarch64 wheels are the fragile part of the install. Vosk ships clean
aarch64 wheels and a tiny Spanish model, and with a restricted grammar it
spots both the wake word and the command reliably — the "easiest that
works". The agent still runs (UI play/stop + radio) even if Vosk fails to
install, so you're never fully blocked.
