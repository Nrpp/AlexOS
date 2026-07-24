"""Lists installed modules (name/description/icon/widgets from their
manifests) - used by Settings' home-screen-widget picker to show real
module names instead of raw folder slugs."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.models.schemas import RegisteredModule

router = APIRouter()


@router.get("/modules", response_model=list[RegisteredModule])
async def get_modules(request: Request) -> list[RegisteredModule]:
    module_manager = request.app.state.module_manager
    return [
        RegisteredModule(manifest=module.manifest, has_backend=module.has_backend, has_frontend=module.has_frontend)
        for module in module_manager.modules
    ]
