# AI

Powers the AI page's chat card.

## This is not real AI - read this before anything else

`backend/state.py` matches your message against `config.json`'s keyword
rules and returns a canned reply, falling back to an honest "I'm not a
real assistant yet" message if nothing matches. There is no language
model here, local or cloud, and no API key - wiring one up is explicitly
future work (`ROADMAP.md`'s 0.4.0). The widget's subtitle says as much
too, so nobody mistakes this for intelligence it doesn't have.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/ai/messages` (full
  history), `POST /messages` (send a message, get a scripted reply back,
  publishes `ai.reply`).
- **Frontend** (`frontend/index.tsx`): a compact chat UI - message
  history and an input.

## Going real

Replacing the keyword matcher with an actual LLM call means: picking a
provider (local model via something like Ollama, or a cloud API),
putting its credentials in `.env` (never in code, per the project's
security rules), and swapping `state.py`'s `_generate_reply` for a real
call. The router, event, and widget don't need to change - they only
ever see `{ id, role, text, createdAt }`.

## Configuration

`config.json`:

- `rules` - each entry is `{ "keywords": [...], "reply": "..." }`;
  the first rule whose keyword appears in the message (case-insensitive)
  wins.
- `fallbackReply` - used when no rule matches.
