# Tasks

Powers the Home page's "Today's tasks" card and its Quick Actions "Add
task" button.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/tasks/tasks` (list,
  incomplete first), `POST /tasks` (create, publishes `task.created`),
  `PATCH /tasks/{id}` (toggle, publishes `task.completed` when marked
  done). No `on_load` hook - it only ever publishes from route handlers
  via `request.app.state.event_bus`, so it doesn't need one.
- **Frontend** (`frontend/index.tsx`): a `TasksWidget` with an inline
  add-task input and a tap-to-complete list. It refetches on
  `task.created`/`task.completed` rather than patching local state, so
  it stays correct no matter where a task was created (its own input,
  Home's Quick Actions, or anywhere else that calls the same endpoint).

## In-memory, by design

Tasks live in a plain dict in `backend/state.py` and are lost on backend
restart. Persisting them for real is future work - once the Storage
Manager's repository pattern is extended for module-owned tables, this
module gains a `tasks` table instead of `_tasks: dict[str, Task]`,
without the router, events, or widget needing to change.
