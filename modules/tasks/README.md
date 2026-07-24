# Tasks

Powers the Home page's "Today's tasks" card and its Quick Actions "Add
task" button. **Real data** via Google Tasks.

## Setup

Shares one Google OAuth client with `modules/communication` and
`modules/calendar` - if you've already run
`scripts/google_oauth_setup.py` for one of those, the same `.env`
values cover this module too.

If not yet done:

```bash
python scripts/google_oauth_setup.py path/to/client_secret_....json
```

`config.json`'s `taskListId` defaults to `"@default"` (your default
Google Tasks list) - set it to a specific list ID if you want a
different one.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/tasks/tasks` (list,
  incomplete first), `POST /tasks` (create, publishes `task.created`),
  `PATCH /tasks/{id}` (toggle, publishes `task.completed` when marked
  done). `on_load` also polls every `config.json`'s
  `tickIntervalSeconds` (60s default) and publishes `tasks.updated`
  (retained) - **this is the fix for tasks not appearing without a
  manual reload**: previously a task added in the Google Tasks app
  itself (not through AlexOS) had no way to reach the widget until the
  page was reloaded, since nothing was watching for external changes.
- **Frontend** (`frontend/index.tsx`): a `TasksWidget` with an inline
  add-task input and a tap-to-complete list. Refetches instantly on its
  own `task.created`/`task.completed` actions, and on `tasks.updated`
  for changes made anywhere else. A real failure now shows the actual
  error message with a retry button instead of silently looking like
  "not connected."

## Scope

Uses the full `tasks` scope (read/write) - narrower scopes for Google
Tasks don't exist; this is the only option for creating and completing
tasks.
