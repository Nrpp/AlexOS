# Alex Assistant

Powers the Alex page's connection/reminders card and status card. **Real
data** via Proyect-ALEX, the Alex personal assistant running on its own
Raspberry Pi (separate device and separate repo from AlexOS).

## Setup

1. On the Alex Pi, make sure `alex/server` is reachable from the AlexOS
   Pi (same LAN, or Tailscale) and note its base URL, e.g.
   `http://alex-pi.local:8787`.
2. If Proyect-ALEX has `ALEX_API_TOKEN` set (recommended - see its own
   `.env.example`), copy that same value here too; the two tokens must
   match, since it's Proyect-ALEX that validates it.
3. Add both to your own `.env` on the AlexOS Pi (never commit this file,
   never paste the token anywhere else):

   ```bash
   ALEX_ASSISTANT_BASE_URL=http://alex-pi.local:8787
   ALEX_ASSISTANT_API_TOKEN=<same value as Proyect-ALEX's ALEX_API_TOKEN>
   ```

4. Restart the backend (`docker compose ... up -d --build` or your dev
   server). `ALEX_ASSISTANT_API_TOKEN` can be left empty if Proyect-ALEX
   itself has no token configured (its own "insecure local dev" mode) -
   otherwise the connection will authenticate but every request will be
   rejected.

## What it does

- **Backend** (`backend/`):
  - `on_load(event_bus, config)` starts two background tasks:
    - a persistent WebSocket connection to Proyect-ALEX
      (`backend/connection.py`), reconnecting with exponential backoff
      (`config.json`'s `reconnectMinDelaySeconds`/`reconnectMaxDelaySeconds`).
      Every `notification` message it receives is translated into an
      `alex_assistant.notification` event - priority mapped from
      Proyect-ALEX's 0-3 integer scale to AlexOS's named levels (see
      `map_priority` in `backend/state.py`) - and publishes
      `alex_assistant.connection` (retained, so a freshly opened AlexOS
      client sees current connection state immediately, not just on the
      next change).
    - a status poll (`config.json`'s `statusPollIntervalSeconds`, 30s
      default) hitting Proyect-ALEX's `GET /health`, publishing
      `alex_assistant.status` (also retained).
  - `GET /api/v1/modules/alex_assistant/status` - proxies `GET /health`.
  - `GET /api/v1/modules/alex_assistant/reminders` - proxies
    `GET /reminders`.
  - `DELETE /api/v1/modules/alex_assistant/reminders/{id}` - proxies
    `DELETE /reminders/{id}` and publishes `alex_assistant.reminders_changed`.
  - Creating a reminder isn't exposed here - it stays chat-only, through
    Proyect-ALEX's own `set_reminder` tool, since the AI is what resolves
    relative times like "in 30 minutes".
- **Frontend** (`frontend/index.tsx`): two widgets, matching
  `modules/servers`'s two-widget pattern -
  - `AlexAssistantWidget` (default export): connection indicator and the
    pending reminders list, each cancellable.
  - `AlexAssistantStatusWidget` (named export): AI provider, AI
    reachability, voice enabled/disabled, and plugin/tool counts.
  Both show a clear "Alex isn't connected yet" state if
  `ALEX_ASSISTANT_BASE_URL` isn't set, and refresh on their respective
  Event Bus events rather than polling from the browser.
- **Notification rule** (`apps/api/app/core/notification_rules.py`):
  maps `alex_assistant.notification` to a real AlexOS notification via
  `NotificationManager.notify()` - this is what makes a Proyect-ALEX
  notification (a reminder firing, a confirmed shell command finishing,
  ...) show up as an AlexOS notification too, sound included (see
  `apps/web/src/layout/NotificationsLayer.tsx`).

## Why a WebSocket connection instead of polling

Proyect-ALEX's notifications are inherently push-driven (reminders firing
on their own schedule, confirmations resolving from a different device) -
polling would either miss the timing or need a much shorter interval
than is reasonable for a background loop. Status has no such push path
on Proyect-ALEX's side (see its `alex/server/ws.py` - only `notification`
and `chat.reply` are ever pushed), so that part is polled instead.
