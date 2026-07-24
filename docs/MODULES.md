# Modules

Every feature in AlexOS is a module. A module can be added or removed
without touching the Core or any other module.

## Folder shape

```
modules/<name>/
  manifest.json     # identity, permissions, dependencies, routes, widgets
  config.json        # module-specific configuration
  README.md
  backend/
    __init__.py       # exposes `router` and/or `on_load(event_bus, config)`
    ...
  frontend/
    index.tsx          # default-exports the module's widget component
  assets/
  tests/
```

`modules/clock` is the reference implementation - copy its shape when
starting a new module.

## manifest.json

```json
{
  "name": "clock",
  "version": "0.0.1",
  "author": "AlexOS",
  "description": "...",
  "permissions": [],
  "dependencies": [],
  "routes": ["/time"],
  "widgets": [{ "id": "clock", "name": "Clock", "description": "..." }],
  "icon": "schedule"
}
```

Validated on every backend boot against the `ModuleManifest` Pydantic
schema (`apps/api/app/models/schemas.py`). A module with an invalid or
missing manifest is skipped and logged - it never crashes the whole
system.

## Backend discovery

`ModuleManager.discover()` scans `modules/*/manifest.json`. For each
module with a `backend/__init__.py`, `ModuleManager.load_backend_routers()`
dynamically imports the package via `importlib` (no pip install, no
manual registration) and:

1. Mounts `router` (a FastAPI `APIRouter`, if the module defines one) at
   `/api/v1/modules/<name>`.
2. Calls `on_load(event_bus, config)` (if defined) - the only way a module
   gets a handle to the Event Bus, and the only way it sees its own
   `config.json` (parsed to a plain dict, `{}` if the file is missing or
   invalid - never crashes the module). This is where a module starts
   background work, like `clock`'s tick loop, whose interval comes from
   `config.json`'s `tickIntervalSeconds` rather than being hardcoded.

A module needs neither of these - a manifest with only frontend widgets
is entirely valid.

### Import gotcha: `from .sibling import name`, never `from . import sibling`

Because each module's backend is loaded via a hand-built
`importlib` spec rather than a normal package import (see
`ModuleManager._import_backend_package`), only the package itself
(`backend/__init__.py`) is registered in `sys.modules` - not a
standalone entry for each sibling file. Importing specific names out
of a sibling file (`from .state import provider`, `from .router import
router` - the pattern every module already uses) works fine. Importing
a sibling *module itself* as an attribute (`from . import state`, or
`from . import wifi, bluetooth` if you have two files with a
same-named function you want to keep qualified) raises
`ModuleNotFoundError: No module named 'alexos_modules'` instead - hit
once while building `modules/control_center`, whose `wifi.py` and
`bluetooth.py` both define `is_available()`. Fixed there by importing
each name explicitly with an alias
(`from .wifi import is_available as wifi_available`) instead.

## Frontend discovery

`apps/web/src/modules/registry.ts` uses
`import.meta.glob("../../../../modules/*/frontend/index.tsx")` to build a
widget registry at build time. A module's `frontend/index.tsx` default-
exports a component accepting `{ eventBus?: EventBusLike; apiBaseUrl?: string }`
- the same dependency-injection pattern as the backend's `on_load`, so a
widget never imports the host app's context directly and stays portable
to a future mobile or desktop client. `apiBaseUrl` is there for widgets
that need an initial REST fetch (most do - the Event Bus tells you when
something *changed*, not what the current state already is) or that
write data back (like `tasks`).

## Building a new module

1. Copy `modules/clock`'s folder shape.
2. Write `manifest.json` - at minimum `name`, `version`, `author`,
   `description`.
3. If the module needs its own events, publish them from `on_load` or
   from a route handler via the `event_bus` passed in - never import
   another module to reach it.
4. If the module needs configuration (a poll interval, a location, seed
   data), put it in `config.json` and read it from the `config` dict
   `on_load` receives - never hardcode a value that belongs there.
5. If the module needs a secret (an API token, a base URL for a private
   instance), read it from the environment directly (`os.environ`) -
   never put it in `config.json`, which is committed to git. Document
   the expected variable names in the module's own README and add them
   (empty) to the repo root's `.env.example`. See `modules/room` for the
   pattern (`HA_BASE_URL`/`HA_ACCESS_TOKEN`).
6. If the module has a widget, export a default component from
   `frontend/index.tsx` using `@alexos/ui`, `@alexos/hooks`, and
   `@alexos/utils` rather than rebuilding primitives.
7. Add a test under `tests/`.

No router file, no `package.json` entry, no manual wiring anywhere else
in the repo - restart the backend (or let `--reload` pick it up in dev)
and the module is live.
