# Communication

Powers the Communication page's inbox card.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/communication/messages`
  (newest first), `PATCH /messages/{id}` to mark read, and an
  `on_load(event_bus, config)` hook that simulates a new message arriving
  every `config.json`'s `newMessageIntervalSeconds` (120s default),
  publishing `mail.received`.
- **Frontend** (`frontend/index.tsx`): a `CommunicationWidget` listing
  messages, unread ones highlighted; tapping one marks it read.

## Mock inbox, and why

Gmail (or any real mailbox) means OAuth and a real API key - neither
belongs in this pass. `backend/state.py` generates plausible messages
from a small pool of canned senders/subjects instead. Going real means
replacing the generator with an actual Gmail API client; the router,
event, and widget don't need to change, since they only ever see the
same `{ id, sender, subject, snippet, unread, receivedAt }` shape.

## Configuration

`config.json`'s `newMessageIntervalSeconds` - how often a simulated
message arrives.
