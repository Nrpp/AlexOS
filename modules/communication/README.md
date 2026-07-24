# Communication

Powers the Communication page's inbox card. **Real data** via Gmail.

## Setup

Shares one Google OAuth client with `modules/calendar` and
`modules/tasks` - if you've already run
`scripts/google_oauth_setup.py` for one of those, the same
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REFRESH_TOKEN` in your
`.env` cover this module too, no extra setup needed.

If not yet done:

```bash
python scripts/google_oauth_setup.py path/to/client_secret_....json
```

Follow the printed instructions, then add the three lines it prints to
your `.env` on the Pi and restart the backend.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/communication/messages`
  (10 most recent inbox messages via the Gmail API), `GET
  /messages/{id}` (the full message - sender, subject, date, and body -
  and marks it read as a side effect, matching Gmail's own "opening a
  message marks it read" behavior). `on_load(event_bus, config)` polls
  every `config.json`'s `pollIntervalSeconds` (120s default) and
  publishes `mail.received` for messages not seen in a previous poll -
  the first poll after startup just establishes the baseline, so you
  don't get ten "new mail" notifications the moment the backend boots.
- **Full message body** (`backend/state.py`'s `extract_body_text`):
  Gmail's API returns a message as a MIME tree (often
  `multipart/alternative` with both `text/plain` and `text/html`
  parts). This walks that tree, preferring `text/plain`; if only HTML
  is available, it's converted to plain text server-side (tags
  stripped, entities decoded) rather than sent to the frontend as raw
  HTML - avoids needing an HTML sanitizer library just to safely
  display someone else's markup. Covered by
  `tests/test_body_extraction.py` (simple, multipart, nested-multipart,
  HTML-only, and empty-body cases) since there's no live Gmail account
  in CI to exercise this against.
- **Frontend** (`frontend/index.tsx`): a `CommunicationWidget` listing
  messages, unread ones highlighted; clicking one opens
  `MessageViewerDialog`, which fetches and shows the full body. Shows a
  clear "Gmail isn't connected" state if the OAuth env vars aren't set.
  A "Unread only" toggle filters the list client-side - since it
  filters within whatever's already been fetched, it only ever
  narrows the current 10 most recent messages, not your whole inbox's
  unread count.

## Scope

Uses the `gmail.modify` scope (read + label changes, e.g. marking
read) - not `gmail.readonly`, since marking a message read needs write
access to labels. Never requests `gmail.send` or full account access.
