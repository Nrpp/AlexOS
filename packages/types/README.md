# @alexos/types

Shared TypeScript contracts for events, module manifests, and API responses.

## Source of truth

The backend's Pydantic schemas (`apps/api/app/models/schemas.py`) are
canonical. The types in this package are hand-mirrored for the Foundation
milestone. As the API surface grows, generate these from the FastAPI
OpenAPI schema instead of hand-mirroring (e.g. `openapi-typescript`) so the
two can never silently drift.
