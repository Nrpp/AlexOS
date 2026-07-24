"""Canonical Pydantic schemas. @alexos/types mirrors these for the frontend.

All models serialize to camelCase over the wire so the JSON matches the
TypeScript contracts field-for-field with no translation layer.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SystemHealth(CamelModel):
    status: Literal["ok", "degraded"]
    version: str
    uptime_seconds: float
    modules_loaded: int


class AppConfig(CamelModel):
    theme: Literal["dark", "light"] = "dark"
    user_name: str = "there"


NotificationPriority = Literal["critical", "warning", "information", "success"]


class Notification(CamelModel):
    id: str
    priority: NotificationPriority
    title: str
    message: str
    created_at: datetime


class ModuleWidgetDeclaration(CamelModel):
    id: str
    name: str
    description: str | None = None


class ModuleManifest(CamelModel):
    """Shape of a module's manifest.json, mirrored by @alexos/types ModuleManifest."""

    name: str
    version: str
    author: str
    description: str
    permissions: list[str] = []
    dependencies: list[str] = []
    routes: list[str] = []
    widgets: list[ModuleWidgetDeclaration] = []
    icon: str | None = None


class RegisteredModule(CamelModel):
    manifest: ModuleManifest
    has_backend: bool
    has_frontend: bool


class HomeWidgetSelection(CamelModel):
    """Which modules' widgets show on Home, persisted across restarts.
    `module_names: None` means "no explicit choice yet" - the frontend
    falls back to a sensible built-in default rather than showing
    nothing (see apps/web/src/pages/Home/index.tsx's
    DEFAULT_HOME_MODULE_NAMES)."""

    module_names: list[str] | None = None


class EventEnvelope(CamelModel):
    name: str
    payload: Any = None
    emitted_at: datetime
    source: str = "core"
