from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import config, events, notifications, system

router = APIRouter(prefix="/api/v1")
router.include_router(system.router, tags=["system"])
router.include_router(config.router, tags=["config"])
router.include_router(events.router, tags=["events"])
router.include_router(notifications.router, tags=["notifications"])
