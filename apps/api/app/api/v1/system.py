from __future__ import annotations

import time

from fastapi import APIRouter, Request

from app.models.schemas import SystemHealth

router = APIRouter()


@router.get("/system/health", response_model=SystemHealth)
async def get_health(request: Request) -> SystemHealth:
    module_manager = request.app.state.module_manager
    started_at: float = request.app.state.started_at
    return SystemHealth(
        status="ok",
        version=request.app.state.settings.version,
        uptime_seconds=time.monotonic() - started_at,
        modules_loaded=len(module_manager.modules),
    )
