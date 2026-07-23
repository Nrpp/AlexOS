from __future__ import annotations

from fastapi import APIRouter, Request

from app.models.schemas import AppConfig

router = APIRouter()


@router.get("/config", response_model=AppConfig)
async def get_config(request: Request) -> AppConfig:
    return await request.app.state.config_manager.get_config()


@router.put("/config", response_model=AppConfig)
async def update_config(config: AppConfig, request: Request) -> AppConfig:
    return await request.app.state.config_manager.update_config(config)
