from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import create_item, delete_item, list_items, update_item

router = APIRouter()


class CreateExamRequest(BaseModel):
    name: str
    date: str  # ISO date, e.g. "2026-08-15"


class CreateHomeworkRequest(BaseModel):
    title: str
    dueDate: str | None = None


class UpdateHomeworkRequest(BaseModel):
    completed: bool


class CreateTodoRequest(BaseModel):
    title: str


class UpdateTodoRequest(BaseModel):
    completed: bool


@router.get("/exams")
async def get_exams(request: Request) -> list[dict]:
    exams = await list_items(request.app.state.storage_manager, "exams")
    return sorted(exams, key=lambda exam: exam["date"])


@router.post("/exams", status_code=201)
async def post_exam(body: CreateExamRequest, request: Request) -> dict:
    return await create_item(request.app.state.storage_manager, "exams", body.model_dump())


@router.delete("/exams/{exam_id}", status_code=204, response_model=None)
async def remove_exam(exam_id: str, request: Request) -> None:
    deleted = await delete_item(request.app.state.storage_manager, "exams", exam_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Exam not found.")


@router.get("/homework")
async def get_homework(request: Request) -> list[dict]:
    return await list_items(request.app.state.storage_manager, "homework")


@router.post("/homework", status_code=201)
async def post_homework(body: CreateHomeworkRequest, request: Request) -> dict:
    fields = body.model_dump()
    fields["completed"] = False
    return await create_item(request.app.state.storage_manager, "homework", fields)


@router.patch("/homework/{item_id}")
async def patch_homework(item_id: str, body: UpdateHomeworkRequest, request: Request) -> dict:
    item = await update_item(request.app.state.storage_manager, "homework", item_id, body.model_dump())
    if item is None:
        raise HTTPException(status_code=404, detail="Homework item not found.")
    return item


@router.delete("/homework/{item_id}", status_code=204, response_model=None)
async def remove_homework(item_id: str, request: Request) -> None:
    deleted = await delete_item(request.app.state.storage_manager, "homework", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Homework item not found.")


@router.get("/todos")
async def get_todos(request: Request) -> list[dict]:
    return await list_items(request.app.state.storage_manager, "todos")


@router.post("/todos", status_code=201)
async def post_todo(body: CreateTodoRequest, request: Request) -> dict:
    return await create_item(
        request.app.state.storage_manager, "todos", {"title": body.title, "completed": False}
    )


@router.patch("/todos/{item_id}")
async def patch_todo(item_id: str, body: UpdateTodoRequest, request: Request) -> dict:
    item = await update_item(request.app.state.storage_manager, "todos", item_id, body.model_dump())
    if item is None:
        raise HTTPException(status_code=404, detail="To-do not found.")
    return item


@router.delete("/todos/{item_id}", status_code=204, response_model=None)
async def remove_todo(item_id: str, request: Request) -> None:
    deleted = await delete_item(request.app.state.storage_manager, "todos", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="To-do not found.")
