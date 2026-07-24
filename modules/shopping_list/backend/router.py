from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import clear_checked, create_item, delete_item, list_items, toggle_item

router = APIRouter()


class CreateItemRequest(BaseModel):
    title: str


class ToggleItemRequest(BaseModel):
    checked: bool


@router.get("/items")
async def get_items(request: Request) -> list[dict]:
    return await list_items(request.app.state.storage_manager)


@router.post("/items", status_code=201)
async def post_item(body: CreateItemRequest, request: Request) -> dict:
    return await create_item(request.app.state.storage_manager, body.title)


@router.patch("/items/{item_id}")
async def patch_item(item_id: str, body: ToggleItemRequest, request: Request) -> dict:
    item = await toggle_item(request.app.state.storage_manager, item_id, body.checked)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found.")
    return item


@router.delete("/items/{item_id}", status_code=204, response_model=None)
async def remove_item(item_id: str, request: Request) -> None:
    deleted = await delete_item(request.app.state.storage_manager, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found.")


@router.post("/items/clear-checked", response_model=None)
async def post_clear_checked(request: Request) -> None:
    await clear_checked(request.app.state.storage_manager)
