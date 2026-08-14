from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import create_item, delete_item, list_items, update_item

router = APIRouter()


class CreateItemRequest(BaseModel):
    title: str
    score: float
    maxScore: float


class UpdateItemRequest(BaseModel):
    title: str | None = None
    score: float | None = None
    maxScore: float | None = None


@router.get("/items")
async def get_items(request: Request) -> list[dict]:
    return await list_items(request.app.state.storage_manager)


@router.post("/items", status_code=201)
async def post_item(body: CreateItemRequest, request: Request) -> dict:
    return await create_item(request.app.state.storage_manager, body.title, body.score, body.maxScore)


@router.patch("/items/{item_id}")
async def patch_item(item_id: str, body: UpdateItemRequest, request: Request) -> dict:
    updates = body.model_dump(exclude_unset=True)
    item = await update_item(request.app.state.storage_manager, item_id, updates)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found.")
    return item


@router.delete("/items/{item_id}", status_code=204, response_model=None)
async def remove_item(item_id: str, request: Request) -> None:
    deleted = await delete_item(request.app.state.storage_manager, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found.")
