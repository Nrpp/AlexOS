"""Application configuration, sourced from environment variables only.

Per the AlexOS security rules: never hardcode secrets, never commit them -
everything configurable comes from the environment (see .env.example at
the repo root).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# apps/api/app/settings.py -> parents[3] is the repo root (AlexOS/).
_REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ALEXOS_", env_file=".env", extra="ignore")

    env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    database_url: str = "sqlite+aiosqlite:///./alexos.db"
    cors_origins: str = "http://localhost:5173"
    modules_dir: Path = _REPO_ROOT / "modules"
    version: str = "0.0.1"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
