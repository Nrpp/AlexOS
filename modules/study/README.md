# Study

Powers the Study page's Pomodoro timer.

## What it does

- **No backend.** A Pomodoro timer needs nothing but a clock, so this
  module has no `backend/` folder at all - proof that a module with only
  frontend widgets is entirely valid (per `docs/MODULES.md`).
- **Frontend** (`frontend/index.tsx`): a `PomodoroWidget` with
  start/pause/reset and an automatic work → break → work cycle.

## Known limitation: config.json isn't wired up yet

`config.json`'s `workMinutes`/`breakMinutes` document the intended
defaults, but nothing reads them - there's no backend to serve them to
the frontend. The widget currently hardcodes the same values directly.
Closing this gap means adding a minimal `backend/` exposing `GET
/config` that returns `config.json` verbatim - a few lines, deliberately
not done yet since this module works fully without it.

## Roadmap

Exam countdown, homework, study goals, and statistics (per the product
spec) are additional widgets for this module once the frontend registry
supports more than one widget per module (`apps/web/src/modules/registry.ts`
currently wires exactly one default export per module).
