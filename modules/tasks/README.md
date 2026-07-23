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
  done). All backed by the real Google Tasks API - no `on_load`
  background work, since it's entirely request-driven.
- **Frontend** (`frontend/index.tsx`): a `TasksWidget` with an inline
  add-task input and a tap-to-complete list. Refetches on
  `task.created`/`task.completed` rather than patching local state, so
  it stays correct no matter where a task was created (its own input,
  Home's Quick Actions, or the Google Tasks app itself on next refresh).

## Scope

Uses the full `tasks` scope (read/write) - narrower scopes for Google
Tasks don't exist; this is the only option for creating and completing
tasks.
