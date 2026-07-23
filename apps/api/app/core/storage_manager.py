"""AlexOS Storage Manager.

The only place that speaks SQL. Every other service - Config Manager,
Notification Manager, future modules - goes through this repository
instead of touching SQLAlchemy directly, so the storage engine can change
(SQLite -> PostgreSQL) without rippling through the codebase.
"""

from __future__ import annotations

from sqlalchemy import select

from app.db.database import Database
from app.db.models import ConfigEntry, NotificationRecord


class StorageManager:
    def __init__(self, database: Database) -> None:
        self._database = database

    async def init(self) -> None:
        await self._database.init_models()

    async def get_config_value(self, key: str) -> str | None:
        async with self._database.session() as session:
            result = await session.get(ConfigEntry, key)
            return result.value if result else None

    async def set_config_value(self, key: str, value: str) -> None:
        async with self._database.session() as session:
            entry = await session.get(ConfigEntry, key)
            if entry is None:
                session.add(ConfigEntry(key=key, value=value))
            else:
                entry.value = value
            await session.commit()

    async def save_notification(self, record: NotificationRecord) -> None:
        async with self._database.session() as session:
            session.add(record)
            await session.commit()

    async def list_recent_notifications(self, limit: int = 20) -> list[NotificationRecord]:
        async with self._database.session() as session:
            result = await session.execute(
                select(NotificationRecord).order_by(NotificationRecord.created_at.desc()).limit(limit)
            )
            return list(result.scalars().all())
