# AlexOS

The personal operating system. Not a dashboard, not a website — the digital
center of your day, built for the Raspberry Pi 5 and its official touch
display, with Android, iPad and desktop planned.

AlexOS is calm, elegant, premium, minimal, fast, and touch-first. Every
feature is a self-contained module; everything communicates through a single
Core so the system can grow without ever tangling itself.

## Status

**Version 0.0.1 — Foundation.** This milestone ships the architecture, not
the features: the monorepo, the Core (Event Bus, Module Manager,
Configuration, Storage, Notifications), the app shell (Status Bar, Dock,
layers), the design-token system, one reference module, and Docker for both
development and production. Real integrations (weather, mail, Spotify,
server stats, ...) arrive as modules on top of this foundation.

See [ROADMAP.md](ROADMAP.md) for what comes next and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it all fits together.

## Project structure

```
AlexOS/
  apps/
    web/       React + Vite + TypeScript frontend
    api/       FastAPI backend
    mobile/    Future mobile app
  packages/
    ui/        Reusable UI primitives (shadcn/ui-based)
    core/      Frontend Core client (Event Bus, API)
    hooks/     Shared React hooks
    types/     Shared TypeScript contracts
    utils/     Shared utilities
    config/    Design tokens
  modules/     Self-contained feature modules (auto-discovered)
  docker/      Compose files for dev and production
  docs/        Architecture, module, and design system docs
  scripts/     Setup and dev convenience scripts
```

## Getting started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (optional, recommended for a production-like run)

First, create your local environment file (both Docker and local dev read it):

```bash
cp .env.example .env
```

### Development (local)

```bash
# from the repo root
./scripts/setup.sh      # installs frontend + backend dependencies
./scripts/dev.sh        # runs the web app and the API together, hot reload
```

Windows: use `scripts/setup.ps1` and `scripts/dev.ps1` instead.

The web app runs at `http://localhost:5173`, the API at `http://localhost:8000`.

### Development (Docker)

```bash
docker compose -f docker/docker-compose.dev.yml up
```

### Production

```bash
docker compose -f docker/docker-compose.yml up -d
```

One command. Nothing more.

## Testing

```bash
npm run test --workspace=apps/web     # frontend (Vitest)
cd apps/api && pytest                 # backend
```

## Design system

See [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for the color palette,
typography, spacing scale, and animation rules that every screen follows.

## Modules

See [docs/MODULES.md](docs/MODULES.md) for how the module system works and
how to build a new one.

## License

See [LICENSE](LICENSE).
