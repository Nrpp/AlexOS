"""AlexOS Module Manager.

Discovers every module under `modules/`, validates its manifest.json, and -
if the module ships a backend - dynamically imports it and mounts its
router. Nothing is registered by hand: dropping a correctly-shaped folder
into `modules/` is the entire installation process for this milestone.
"""

from __future__ import annotations

import importlib.util
import json
import logging
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from fastapi import APIRouter
from pydantic import ValidationError

from app.core.event_bus import EventBus
from app.models.schemas import ModuleManifest

logger = logging.getLogger("alexos.module_manager")


@dataclass
class LoadedModule:
    manifest: ModuleManifest
    path: Path
    has_backend: bool
    has_frontend: bool
    config: dict[str, Any] = field(default_factory=dict)
    router: APIRouter | None = None


class ModuleManager:
    def __init__(self, modules_dir: Path) -> None:
        self._modules_dir = modules_dir
        self._modules: dict[str, LoadedModule] = {}

    @property
    def modules(self) -> list[LoadedModule]:
        return list(self._modules.values())

    def discover(self) -> list[LoadedModule]:
        """Scan `modules/*/manifest.json` and validate each manifest.

        A module with an invalid or missing manifest is skipped and logged,
        never allowed to crash the whole system - modules must be
        independently removable and independently faulty.
        """
        self._modules.clear()
        if not self._modules_dir.exists():
            return []

        for module_dir in sorted(p for p in self._modules_dir.iterdir() if p.is_dir()):
            manifest_path = module_dir / "manifest.json"
            if not manifest_path.exists():
                continue
            try:
                manifest = ModuleManifest.model_validate(json.loads(manifest_path.read_text()))
            except (ValidationError, json.JSONDecodeError) as error:
                logger.warning("Skipping module '%s': invalid manifest (%s)", module_dir.name, error)
                continue

            loaded = LoadedModule(
                manifest=manifest,
                path=module_dir,
                has_backend=(module_dir / "backend" / "__init__.py").exists(),
                has_frontend=(module_dir / "frontend" / "index.tsx").exists(),
                config=self._read_config(module_dir),
            )
            self._modules[manifest.name] = loaded

        return self.modules

    @staticmethod
    def _read_config(module_dir: Path) -> dict[str, Any]:
        config_path = module_dir / "config.json"
        if not config_path.exists():
            return {}
        try:
            return json.loads(config_path.read_text())
        except json.JSONDecodeError as error:
            logger.warning("Ignoring invalid config.json for module '%s' (%s)", module_dir.name, error)
            return {}

    def load_backend_routers(self, event_bus: EventBus) -> list[tuple[str, APIRouter]]:
        """Dynamically import each module's backend package, mount its router if
        any, and call its optional `on_load(event_bus, config)` startup hook -
        the only way a module gets a handle to the Event Bus and its own
        config.json."""
        mounted: list[tuple[str, APIRouter]] = []
        for module in self._modules.values():
            if not module.has_backend:
                continue
            try:
                imported = self._import_backend_package(module)
            except Exception:
                logger.exception("Failed to load backend for module '%s'", module.manifest.name)
                continue

            router = getattr(imported, "router", None)
            if router is not None:
                module.router = router
                mounted.append((module.manifest.name, router))

            on_load = getattr(imported, "on_load", None)
            if callable(on_load):
                try:
                    on_load(event_bus, module.config)
                except Exception:
                    logger.exception("on_load() failed for module '%s'", module.manifest.name)

        return mounted

    @staticmethod
    def _import_backend_package(module: LoadedModule):
        backend_dir = module.path / "backend"
        init_file = backend_dir / "__init__.py"
        module_name = f"alexos_modules.{module.manifest.name}.backend"

        spec = importlib.util.spec_from_file_location(
            module_name, init_file, submodule_search_locations=[str(backend_dir)]
        )
        if spec is None or spec.loader is None:
            raise ImportError(f"Cannot build import spec for module '{module.manifest.name}'")

        imported = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = imported
        spec.loader.exec_module(imported)

        return imported
