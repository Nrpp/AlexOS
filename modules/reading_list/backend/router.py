from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import create_book, delete_book, list_books, update_status

router = APIRouter()


class CreateBookRequest(BaseModel):
    title: str
    author: str = ""


class UpdateStatusRequest(BaseModel):
    status: Literal["want", "reading", "done"]


@router.get("/books")
async def get_books(request: Request) -> list[dict]:
    return await list_books(request.app.state.storage_manager)


@router.post("/books", status_code=201)
async def post_book(body: CreateBookRequest, request: Request) -> dict:
    return await create_book(request.app.state.storage_manager, body.title, body.author)


@router.patch("/books/{book_id}")
async def patch_book(book_id: str, body: UpdateStatusRequest, request: Request) -> dict:
    book = await update_status(request.app.state.storage_manager, book_id, body.status)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found.")
    return book


@router.delete("/books/{book_id}", status_code=204, response_model=None)
async def remove_book(book_id: str, request: Request) -> None:
    deleted = await delete_book(request.app.state.storage_manager, book_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Book not found.")
