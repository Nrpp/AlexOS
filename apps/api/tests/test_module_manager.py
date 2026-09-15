"""Covers load_backend_routers' dispatch of on_load(event_bus, config)
vs on_load(event_bus, config, storage_manager=...) - see docs/MODULES.md's
"Background work that needs storage" section and
modules/presence/backend/__init__.py, the first module that needs the
storage_manager form for its Bluetooth-presence tick loop."""

import json
from pathlib import Path

from app.core.event_bus import EventBus
from app.core.module_manager import ModuleManager


def _write_module(modules_dir: Path, name: str, on_load_body: str) -> None:
    module_dir = modules_dir / name
    (module_dir / "backend").mkdir(parents=True)
    (module_dir / "manifest.json").write_text(
        json.dumps({"name": name, "version": "0.1.0", "author": "test", "description": "test module"})
    )
    (module_dir / "backend" / "__init__.py").write_text(on_load_body)


def test_on_load_without_storage_manager_parameter_is_called_with_two_args(tmp_path: Path) -> None:
    _write_module(
        tmp_path,
        "plain_module",
        "calls = []\n\n\ndef on_load(event_bus, config):\n    calls.append((event_bus, config))\n",
    )
    manager = ModuleManager(tmp_path)
    manager.discover()
    event_bus = EventBus()
    manager.load_backend_routers(event_bus, storage_manager=object())

    imported = __import__("sys").modules["alexos_modules.plain_module.backend"]
    assert len(imported.calls) == 1
    assert imported.calls[0][0] is event_bus


def test_on_load_with_storage_manager_parameter_receives_it_as_a_keyword(tmp_path: Path) -> None:
    _write_module(
        tmp_path,
        "storage_module",
        "calls = []\n\n\ndef on_load(event_bus, config, storage_manager):\n"
        "    calls.append((event_bus, config, storage_manager))\n",
    )
    manager = ModuleManager(tmp_path)
    manager.discover()
    event_bus = EventBus()
    sentinel_storage = object()
    manager.load_backend_routers(event_bus, storage_manager=sentinel_storage)

    imported = __import__("sys").modules["alexos_modules.storage_module.backend"]
    assert len(imported.calls) == 1
    assert imported.calls[0][2] is sentinel_storage


def test_on_load_raising_does_not_stop_other_modules_from_loading(tmp_path: Path) -> None:
    _write_module(tmp_path, "broken_module", "def on_load(event_bus, config):\n    raise RuntimeError('boom')\n")
    _write_module(tmp_path, "healthy_module", "calls = []\n\n\ndef on_load(event_bus, config):\n    calls.append(1)\n")
    manager = ModuleManager(tmp_path)
    manager.discover()
    manager.load_backend_routers(EventBus(), storage_manager=object())

    imported = __import__("sys").modules["alexos_modules.healthy_module.backend"]
    assert imported.calls == [1]
