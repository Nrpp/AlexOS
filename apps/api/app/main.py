"""AlexOS API entry point.

Startup order matters: Storage Manager first (everything else may need to
read/write), then the Event Bus, then the Module Manager (which needs the
Event Bus to hand to modules), then the services that sit on top.
"""

from __future__ import annotations

import asyncio
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_v1_router
from app.core.config_manager import ConfigManager
from app.core.event_bus import EventBus
from app.core.module_manager import ModuleManager
from app.core.notification_manager import NotificationManager
from app.core.notification_rules import register_notification_rules
from app.core.storage_manager import StorageManager
from app.db.database import Database
from app.settings import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    app.state.started_at = time.monotonic()

    database = Database(settings.database_url)
    storage_manager = StorageManager(database)
    await storage_manager.init()

    event_bus = EventBus()
    module_manager = ModuleManager(settings.modules_dir)
    module_manager.discover()
    # Modules with a background tick loop (weather, network, calendar, ...)
    # call asyncio.create_task() from inside on_load() - snapshot the task
    # set before loading so shutdown can cancel exactly the ones modules
    # spawned, not anything else running on the loop.
    tasks_before_modules = asyncio.all_tasks()
    for name, module_router in module_manager.load_backend_routers(event_bus):
        app.include_router(module_router, prefix=f"/api/v1/modules/{name}", tags=[name])
    module_background_tasks = asyncio.all_tasks() - tasks_before_modules

    app.state.database = database
    app.state.storage_manager = storage_manager
    app.state.event_bus = event_bus
    app.state.module_manager = module_manager
    app.state.config_manager = ConfigManager(storage_manager)
    notification_manager = NotificationManager(event_bus, storage_manager)
    app.state.notification_manager = notification_manager
    register_notification_rules(event_bus, notification_manager)

    for module in module_manager.modules:
        await event_bus.publish(
            "module.registered",
            {"name": module.manifest.name, "version": module.manifest.version},
            source="module_manager",
        )

    yield

    # Without this, every module's tick loop (an infinite `while True`)
    # keeps running forever - harmless for a single long-lived process,
    # but each fresh app instance (e.g. every TestClient(app) in tests)
    # leaks its own full set, and they pile up across a test session.
    for task in module_background_tasks:
        task.cancel()
    await asyncio.gather(*module_background_tasks, return_exceptions=True)

    await database.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="AlexOS API", version=settings.version, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_v1_router)

    return app


app = create_app()
