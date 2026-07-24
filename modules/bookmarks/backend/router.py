from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import create_bookmark, delete_bookmark, list_bookmarks

router = APIRouter()


class CreateBookmarkRequest(BaseModel):
    title: str
    url: str


@router.get("/bookmarks")
async def get_bookmarks(request: Request) -> list[dict]:
    return await list_bookmarks(request.app.state.storage_manager)


@router.post("/bookmarks", status_code=201)
async def post_bookmark(body: CreateBookmarkRequest, request: Request) -> dict:
    return await create_bookmark(request.app.state.storage_manager, body.title, body.url)


@router.delete("/bookmarks/{bookmark_id}", status_code=204, response_model=None)
async def remove_bookmark(bookmark_id: str, request: Request) -> None:
    deleted = await delete_bookmark(request.app.state.storage_manager, bookmark_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Bookmark not found.")
