from __future__ import annotations

from fastapi import APIRouter, Request

from app.models.schemas import Notification

router = APIRouter()


@router.get("/notifications")
async def get_notifications(request: Request) -> list[Notification]:
    records = await request.app.state.storage_manager.list_recent_notifications()
    return [
        Notification(
            id=record.id,
            priority=record.priority,  # type: ignore[arg-type]
            title=record.title,
            message=record.message,
            created_at=record.created_at,
        )
        for record in records
    ]
