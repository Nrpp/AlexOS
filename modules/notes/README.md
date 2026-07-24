# Notes

Quick, persisted notes - title + body, create/edit/delete. Rendered on
the Home page under "Favorite widgets" rather than a dedicated Dock
page (see `DEDICATED_HOME_WIDGETS` in `apps/web/src/pages/Home/index.tsx` -
this module is deliberately not in that exclusion set).

## What it does

- **Backend** (`backend/`): `GET /notes`, `POST /notes`, `PATCH
  /notes/{id}`, `DELETE /notes/{id}` - all publish `notes.updated`
  (retained) so every rendering of the widget stays in sync. Persisted
  as one JSON blob via the Core Storage Manager's generic module-data
  table (`ModuleDataEntry`), the same lightweight pattern
  `modules/study` uses for its exam/homework/to-do lists - no dedicated
  SQL table needed for a module this size.
- **Frontend** (`frontend/index.tsx`): a `NotesWidget` listing notes
  (most recently updated first), with a shared `NoteEditorDialog` for
  both creating and editing. Home's "New note" quick action
  (`apps/web/src/pages/Home/index.tsx`) opens the same create flow via
  its own copy of the dialog, matching the existing `AddTaskDialog`
  precedent for Tasks.

## No background polling, and why

Unlike Google Tasks/Calendar, notes only ever change through AlexOS
itself - there's no external "Notes app" they could also be edited
in - so there's nothing to poll for and no `on_load` needed.
