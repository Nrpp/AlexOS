# Focus

Powers the Study page's Focus mode widget: start/stop a timed focus
session. AlexOS has no way to remotely flip a "Do Not Disturb" switch on
iPad, Android, or Windows - none of the three expose that to arbitrary
remote calls - so this module is the **trigger**, not the enforcement.
Starting/stopping a session:

1. Publishes `focus.started`/`focus.ended` on the Event Bus (so any
   AlexOS widget can react).
2. Fires an outbound HTTP POST to every URL in `FOCUS_WEBHOOK_URLS` (see
   below) with `{"event": "started" | "ended", "active": bool, "endsAt": string | null}`.
   Best-effort: one unreachable device never blocks the others or fails
   the request that triggered it.
3. If a session isn't stopped manually, it auto-ends (and still fires
   the event + webhooks) once `durationMinutes` elapses - checked every
   5 seconds by a background loop.

Each device needs its own local automation listening for that webhook
(or, for Windows, listening to AlexOS directly) and actually toggling
DND. This is a one-time setup per device.

## `FOCUS_WEBHOOK_URLS` - secret, not config

Like `HA_ACCESS_TOKEN` in `modules/room`, these URLs commonly embed a
secret token (Pushcut and Tasker/Join webhook URLs both do), so they're
read from the environment, never `config.json`. Add to your `.env` on
the Pi (comma-separated if you have more than one device):

```bash
FOCUS_WEBHOOK_URLS=https://api.pushcut.io/xxxx/notifications/focus,https://joinjoaomgcd.appspot.com/_ah/api/messaging/v1/sendPush?...
```

## iPad - Pushcut

1. Install [Pushcut](https://www.pushcut.io/) (free tier covers this).
2. In Pushcut: **Webhooks** tab → **New Webhook** → name it `focus` →
   copy the generated URL into `FOCUS_WEBHOOK_URLS`.
3. In Pushcut: **Automations** → **New Automation** → trigger
   **Notification** (from the `focus` webhook) → action **Run Shortcut**
   → pick/create a Shortcut that calls the **Set Focus** action (built
   into iOS Shortcuts), reading the `event` field from the notification
   to decide on vs. off.

## Android (Samsung) - Tasker + Join, or AutoRemote

1. Install [Tasker](https://tasker.joaoapps.com/) and either
   [Join](https://joaoapps.com/join/) or
   [AutoRemote](https://joaoapps.com/autoremote/) (same developer, both
   free) - either gives Tasker a webhook URL it can react to.
2. Get that app's webhook/push URL, add it to `FOCUS_WEBHOOK_URLS`.
3. In Tasker: **New Profile** → trigger on the Join/AutoRemote event →
   **New Task** → action **Do Not Disturb → Enter/Exit**, branching on
   the incoming `event` field (`started` → Enter, `ended` → Exit).

## Windows - no official API, honest limitation

Windows doesn't expose a supported, scriptable toggle for Focus
Assist. The closest genuinely scriptable, documented approximation is
disabling toast notifications outright via the registry:

```powershell
# Suppress all toast notifications (the practical effect of DND):
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications" /v ToastEnabled /t REG_DWORD /d 0 /f
# Re-enable:
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications" /v ToastEnabled /t REG_DWORD /d 1 /f
```

Since your Windows PC is likely on the same network as the Pi, it can
listen to AlexOS directly instead of needing a public webhook URL - run
a small always-on script that opens a WebSocket to
`ws://<pi-address>:8000/api/v1/events/ws`, watches for
`focus.started`/`focus.ended`, and runs the registry command above.
That script isn't built yet (needs the `websockets` package, unlike
every other script in `scripts/` which is deliberately stdlib-only) -
flagged as follow-up work rather than shipped half-tested.

## What it does

- **Backend** (`backend/`): `POST /start` (`{durationMinutes?}`,
  defaults to `config.json`'s `defaultDurationMinutes`), `POST /stop`,
  `GET /status`. In-memory only - a focus session doesn't need to
  survive a restart.
- **Frontend** (`frontend/index.tsx`): `FocusModeWidget` - duration
  picker, start/stop, shows "Active until HH:MM" while running. Rendered
  on the Study page alongside `modules/study`'s widgets (see
  `apps/web/src/pages/Study/index.tsx`), since focus mode is
  conceptually attached to studying rather than its own page.
