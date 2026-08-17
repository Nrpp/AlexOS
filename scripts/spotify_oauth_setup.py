#!/usr/bin/env python3
"""Run this ONCE, on any machine with a web browser (your laptop is
fine - it doesn't need to be the Pi), to authorize AlexOS to read your
Spotify playback and control it (play/pause/skip).

It prints a refresh token at the end - copy the three lines it prints
into your Pi's .env. This script only talks to Spotify directly; it
never sends anything to AlexOS or anywhere else.

Uses only the Python standard library - no pip install needed.

Prerequisites (https://developer.spotify.com/dashboard):
  1. Create an app (any name/description).
  2. Add this exact Redirect URI to the app's settings:
       http://localhost:8765/callback
  3. Note the Client ID and Client Secret from the app's settings page.

Usage:
    python scripts/spotify_oauth_setup.py --client-id ... --client-secret ...

Requires a Spotify Premium account for playback *control* (play/pause/
skip) - reading what's currently playing works on Free too, but calling
play/pause on a Free account returns a 403 from Spotify's own API, not
an AlexOS bug.
"""

from __future__ import annotations

import argparse
import base64
import http.server
import json
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser

REDIRECT_PORT = 8765
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}/callback"

# Least-privilege scopes for what the media module actually does: see
# what's playing, and play/pause/skip - never create playlists, follow
# artists, or anything else Spotify's API can do.
SCOPES = [
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-modify-playback-state",
]

_auth_code: str | None = None


class _CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        global _auth_code
        query = urllib.parse.urlparse(self.path).query
        _auth_code = urllib.parse.parse_qs(query).get("code", [None])[0]

        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<html><body><h1>Done - you can close this tab.</h1></body></html>")

    def log_message(self, format_string: str, *args: object) -> None:
        pass  # keep this script's own output clean


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--client-id", required=True)
    parser.add_argument("--client-secret", required=True)
    args = parser.parse_args()

    print(f"Redirect URI this script uses: {REDIRECT_URI}")
    print("If that's not already added under this app's Redirect URIs in the")
    print("Spotify Developer Dashboard, add it there first.\n")

    auth_params = {
        "client_id": args.client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
    }
    auth_url = "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode(auth_params)

    server = http.server.HTTPServer(("localhost", REDIRECT_PORT), _CallbackHandler)
    server_thread = threading.Thread(target=server.handle_request)
    server_thread.start()

    print("Opening your browser to sign in and authorize AlexOS...")
    webbrowser.open(auth_url)
    server_thread.join()  # blocks until the one callback request arrives

    if not _auth_code:
        print("Didn't receive an authorization code - did you cancel the consent screen?")
        sys.exit(1)

    basic_auth = base64.b64encode(f"{args.client_id}:{args.client_secret}".encode()).decode()
    token_request = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=urllib.parse.urlencode(
            {"grant_type": "authorization_code", "code": _auth_code, "redirect_uri": REDIRECT_URI}
        ).encode(),
        headers={
            "Authorization": f"Basic {basic_auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    with urllib.request.urlopen(token_request) as response:
        tokens = json.loads(response.read())

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        print("No refresh_token in the response - something went wrong with the")
        print("authorization. Double-check the client id/secret and redirect URI, and try again.")
        sys.exit(1)

    print("\nSuccess. Add these three lines to your Pi's .env:\n")
    print(f"SPOTIFY_CLIENT_ID={args.client_id}")
    print(f"SPOTIFY_CLIENT_SECRET={args.client_secret}")
    print(f"SPOTIFY_REFRESH_TOKEN={refresh_token}")


if __name__ == "__main__":
    main()
