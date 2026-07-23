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
  (10 most recent inbox messages via the Gmail API), `PATCH
  /messages/{id}` (marks read via `gmail.modify`). `on_load(event_bus,
  config)` polls every `config.json`'s `pollIntervalSeconds` (120s
  default) and publishes `mail.received` for messages not seen in a
  previous poll - the first poll after startup just establishes the
  baseline, so you don't get ten "new mail" notifications the moment
  the backend boots.
- **Frontend** (`frontend/index.tsx`): a `CommunicationWidget` listing
  messages, unread ones highlighted; tapping one marks it read. Shows a
  clear "Gmail isn't connected" state if the OAuth env vars aren't set.

## Scope

Uses the `gmail.modify` scope (read + label changes, e.g. marking
read) - not `gmail.readonly`, since marking a message read needs write
access to labels. Never requests `gmail.send` or full account access.
