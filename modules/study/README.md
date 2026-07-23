# Study

Powers the Study page's Pomodoro timer, exam countdown, homework
tracker, and dedicated to-do list.

## What it does

- **Pomodoro** (`PomodoroWidget`, default export): fully client-side,
  no backend - start/pause/reset with an automatic work → break → work
  cycle. `config.json`'s `workMinutes`/`breakMinutes` document the
  intended defaults but aren't wired up yet (see below).
- **Exam countdown** (`ExamCountdownWidget`): add an exam name + date,
  see "In N days"/"Today"/"N days overdue" for each, sorted soonest
  first. Persisted server-side (see below), so it survives restarts.
- **Homework** (`HomeworkWidget`): title + optional due date, check off
  to mark complete, persisted server-side.
- **To-do** (`TodoWidget`): a to-do list scoped to studying, kept
  deliberately separate from the Google-Tasks-backed `modules/tasks`
  used on Home/Communication - this one doesn't need a Google account.

All three persisted widgets go through `backend/router.py`
(`GET/POST/DELETE /api/v1/modules/study/exams`, `GET/POST/PATCH/DELETE
.../homework`, `.../todos`), backed by `backend/state.py`, which stores
each list as one JSON blob via the Core Storage Manager's generic
module-data table (`ModuleDataEntry` in `apps/api/app/db/models.py`) -
no dedicated SQL table needed for a module this size.

## Known limitation: config.json isn't wired up yet

`config.json`'s `workMinutes`/`breakMinutes` are still not read by
Pomodoro - closing this gap means adding an endpoint that serves
`config.json` to the frontend. Deliberately not done yet since Pomodoro
works fully without it.

## Roadmap

"Start focus mode" (per the product spec, triggering Do Not Disturb on
other devices) is a separate module - see `modules/focus` once it
exists - rather than bolted onto this one.
