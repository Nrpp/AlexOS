# Architecture

Architecture matters more than feature count. Every decision here exists
to keep that true as AlexOS grows past this Foundation milestone.

## Layering

```
Frontend (apps/web)
      │
      ▼
   AlexOS Core (apps/api/app/core)
      │
      ▼
    Modules (modules/*)
      │
      ▼
Operating System / External APIs
```

Nothing skips a layer. A widget never calls an external API directly; a
module never imports another module; the frontend never talks to the
operating system. Everything routes through the Core.

## The Core

Five services, each with one job (`apps/api/app/core/`):

| Service | File | Responsibility |
|---|---|---|
| Event Bus | `event_bus.py` | Async pub/sub. The only channel modules use to react to each other. |
| Module Manager | `module_manager.py` | Discovers `modules/*/manifest.json`, validates it, dynamically imports the backend, mounts its router, calls its `on_load` hook. |
| Config Manager | `config_manager.py` | Serves and persists user-facing app configuration. |
| Storage Manager | `storage_manager.py` | The only code that speaks SQL. Everything else goes through its repository methods. |
| Notification Manager | `notification_manager.py` | Persists and publishes notifications - the only way anything surfaces something for the user to see. |

The Core stays lightweight on purpose: it orchestrates, it does not
implement features. Weather logic, mail syncing, Docker stats - all of
that belongs in a module, never in `app/core/`.

## Event Bus

`EventBus.publish(name, payload, source)` builds an envelope
(`{ name, payload, emittedAt, source }`) and calls every handler
subscribed to that name plus every handler subscribed to `"*"`. The
WebSocket gateway (`apps/api/app/api/v1/events.py`) is just one more `"*"`
subscriber - it forwards the whole stream to connected frontends. The
frontend's `EventBusClient` (`packages/core/src/eventBus.ts`) mirrors the
same envelope shape and reconnects with backoff if the socket drops.

## Module system

See [MODULES.md](MODULES.md) for the full contract. In short: a module is
a folder under `modules/`, discovered automatically by both the backend
(Python `importlib`, no pip registration) and the frontend (Vite
`import.meta.glob`, no import edits). Dropping a correctly-shaped folder
into `modules/` is the entire installation step for this milestone.

## Database

SQLite today via async SQLAlchemy (`apps/api/app/db/`). The engine URL is
the only thing that changes to move to PostgreSQL later
(`ALEXOS_DATABASE_URL`) - no code in `storage_manager.py` or above it
needs to change.

## Frontend shell

Every screen is `Status Bar → Main Content → Floating Dock →
Notifications Layer → Dialogs Layer` (`apps/web/src/layout/AppShell.tsx`).
The `CoreProvider` (`apps/web/src/core/CoreProvider.tsx`) is the frontend's
single connection to the Core - one `EventBusClient`, one `ApiClient`,
shared through React Context. Widgets ask the Core; they never fetch
external data themselves.

## Shared packages

`packages/*` exist so nothing is duplicated between `apps/web` and future
clients (`apps/mobile`, a desktop app): design tokens (`config`), TS
contracts (`types`), the frontend Core client (`core`), reusable hooks
(`hooks`), plain utilities (`utils`), and UI primitives (`ui`). A module's
frontend code is expected to depend on these same packages rather than
reinventing a button or a card.
