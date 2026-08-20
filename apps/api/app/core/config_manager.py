"""AlexOS Configuration Manager.

Serves the user-facing app configuration (theme, display name, ...),
backed by the Storage Manager. Falls back to sensible defaults so the
frontend never sees a broken config on first boot.
"""

from __future__ import annotations

from app.core.storage_manager import StorageManager
from app.models.schemas import AppConfig


class ConfigManager:
    def __init__(self, storage: StorageManager) -> None:
        self._storage = storage

    async def get_config(self) -> AppConfig:
        theme = await self._storage.get_config_value("theme")
        user_name = await self._storage.get_config_value("userName")
        idle_timeout_minutes = await self._storage.get_config_value("idleTimeoutMinutes")
        return AppConfig(
            theme=theme if theme in ("dark", "light") else "dark",  # type: ignore[arg-type]
            user_name=user_name or "there",
            idle_timeout_minutes=_parse_non_negative_int(idle_timeout_minutes, default=0),
        )

    async def update_config(self, config: AppConfig) -> AppConfig:
        await self._storage.set_config_value("theme", config.theme)
        await self._storage.set_config_value("userName", config.user_name)
        await self._storage.set_config_value("idleTimeoutMinutes", str(max(0, config.idle_timeout_minutes)))
        return config


def _parse_non_negative_int(raw: str | None, *, default: int) -> int:
    """Never lets a corrupted/hand-edited stored value crash config
    loading - falls back to `default` instead, same "never a broken
    config on first boot" rule as the rest of this class."""
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value >= 0 else default
