# Media

Powers the Media page's now-playing card. **Real data** via Spotify.

## Setup

1. Create an app at https://developer.spotify.com/dashboard (any name/
   description).
2. In the app's settings, add this Redirect URI:
   `http://localhost:8765/callback`
3. Note the app's Client ID and Client Secret from its settings page.
4. On any machine with a browser (your laptop is fine):
   ```bash
   python scripts/spotify_oauth_setup.py --client-id ... --client-secret ...
   ```
   Follow the printed instructions, then add the three lines it prints
   to your `.env` on the Pi and restart the backend.

Playback *control* (play/pause/skip) requires Spotify Premium - Free
accounts can still see what's playing, but calling play/pause returns a
403 from Spotify's own API (not an AlexOS bug). Either way, something
needs to already be playing (or recently paused) on *some* Spotify
device - the Web API controls an active device, it doesn't start
playback from nothing.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/media/now-playing`
  (proxies Spotify's `/me/player/currently-playing`), `POST /playback`
  (`{ "action": "play" | "pause" | "next" | "previous" }`, calls the
  matching Spotify Web API endpoint), and an `on_load(event_bus, config)`
  hook that polls now-playing every `config.json`'s `pollIntervalSeconds`
  (3s default) and publishes `media.updated` only when something
  actually changed (not on every poll) - unlike a purely local
  simulation, real playback position needs polling since it can change
  from any device, not just this app.
- **Frontend** (`frontend/index.tsx`): a `MediaWidget` with play/pause/
  skip controls and a progress bar. Shows a clear "Spotify isn't
  connected" state if the env vars aren't set, and "Nothing playing
  right now" if they are but nothing's currently active.

## Scopes

`user-read-currently-playing`, `user-read-playback-state`,
`user-modify-playback-state` - enough to see and control playback, never
`playlist-modify-*`, `user-follow-modify`, or anything else Spotify's
API can do.
