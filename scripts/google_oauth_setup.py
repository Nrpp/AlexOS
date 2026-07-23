#!/usr/bin/env python3
"""Run this ONCE, on any machine with a web browser (your laptop is
fine - it doesn't need to be the Pi), to authorize AlexOS to access
your Google account (Gmail, Calendar, Tasks).

It prints a refresh token at the end - copy the three lines it prints
into your Pi's .env. This script only talks to Google directly; it
never sends anything to AlexOS or anywhere else.

Uses only the Python standard library - no pip install needed.

Usage:
    python scripts/google_oauth_setup.py path/to/client_secret_....json

If Google rejects the request with "redirect_uri_mismatch": add the
printed redirect URI to this OAuth client's "Authorized redirect URIs"
in Google Cloud Console (APIs & Services -> Credentials), then re-run.
"""

from __future__ import annotations

import http.server
import json
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path

REDIRECT_PORT = 8765
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}/callback"

# Least-privilege scopes for what AlexOS actually does: read/mark-read
# mail, read-only calendar, and full task read/write (tasks are
# created and completed from the UI).
SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/tasks",
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
    if len(sys.argv) != 2:
        print("Usage: python scripts/google_oauth_setup.py path/to/client_secret_....json")
        sys.exit(1)

    secret_data = json.loads(Path(sys.argv[1]).read_text())["web"]
    client_id = secret_data["client_id"]
    client_secret = secret_data["client_secret"]

    print(f"Redirect URI this script uses: {REDIRECT_URI}")
    print("If that's not already an authorized redirect URI for this OAuth")
    print("client in Google Cloud Console, add it there first.\n")

    auth_params = {
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",  # forces a refresh_token even if you've authorized before
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(auth_params)

    server = http.server.HTTPServer(("localhost", REDIRECT_PORT), _CallbackHandler)
    server_thread = threading.Thread(target=server.handle_request)
    server_thread.start()

    print("Opening your browser to sign in and authorize AlexOS...")
    webbrowser.open(auth_url)
    server_thread.join()  # blocks until the one callback request arrives

    if not _auth_code:
        print("Didn't receive an authorization code - did you cancel the consent screen?")
        sys.exit(1)

    token_request = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=urllib.parse.urlencode(
            {
                "client_id": client_id,
                "client_secret": client_secret,
                "code": _auth_code,
                "grant_type": "authorization_code",
                "redirect_uri": REDIRECT_URI,
            }
        ).encode(),
        method="POST",
    )
    with urllib.request.urlopen(token_request) as response:
        tokens = json.loads(response.read())

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        print("No refresh_token in the response - Google only issues one the")
        print("first time you grant consent for this client. Revoke AlexOS's")
        print("access at https://myaccount.google.com/permissions and re-run.")
        sys.exit(1)

    print("\nSuccess. Add these three lines to your Pi's .env:\n")
    print(f"GOOGLE_CLIENT_ID={client_id}")
    print(f"GOOGLE_CLIENT_SECRET={client_secret}")
    print(f"GOOGLE_REFRESH_TOKEN={refresh_token}")


if __name__ == "__main__":
    main()
