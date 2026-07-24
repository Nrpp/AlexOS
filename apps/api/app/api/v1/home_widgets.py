"""Persists which modules' widgets show on Home, via the Storage
Manager's existing generic config key/value store (the same one
backing ConfigManager's theme/userName) - a single JSON-encoded list
under one key, so it survives restarts without a dedicated table."""

from __future__ import annotations

import json

from fastapi import APIRouter, Request

from app.models.schemas import HomeWidgetSelection

router = APIRouter()

_CONFIG_KEY = "homeWidgetModuleNames"


@router.get("/config/home-widgets", response_model=HomeWidgetSelection)
async def get_home_widgets(request: Request) -> HomeWidgetSelection:
    raw = await request.app.state.storage_manager.get_config_value(_CONFIG_KEY)
    return HomeWidgetSelection(module_names=json.loads(raw) if raw else None)


@router.put("/config/home-widgets", response_model=HomeWidgetSelection)
async def put_home_widgets(body: HomeWidgetSelection, request: Request) -> HomeWidgetSelection:
    await request.app.state.storage_manager.set_config_value(_CONFIG_KEY, json.dumps(body.module_names))
    return body
