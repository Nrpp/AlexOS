from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.models.schemas import CamelModel

from .state import Task, create_task, list_tasks, set_completed

router = APIRouter()


class TaskResponse(CamelModel):
    id: str
    title: str
    completed: bool
    created_at: str


class CreateTaskRequest(BaseModel):
    title: str


class UpdateTaskRequest(BaseModel):
    completed: bool


def _to_response(task: Task) -> TaskResponse:
    return TaskResponse(
        id=task.id,
        title=task.title,
        completed=task.completed,
        created_at=task.created_at.isoformat(),
    )


@router.get("/tasks")
async def get_tasks() -> list[TaskResponse]:
    return [_to_response(task) for task in list_tasks()]


@router.post("/tasks", status_code=201)
async def post_task(body: CreateTaskRequest, request: Request) -> TaskResponse:
    task = create_task(body.title)
    response = _to_response(task)
    await request.app.state.event_bus.publish(
        "task.created", response.model_dump(mode="json", by_alias=True), source="tasks"
    )
    return response


@router.patch("/tasks/{task_id}")
async def patch_task(task_id: str, body: UpdateTaskRequest, request: Request) -> TaskResponse:
    task = set_completed(task_id, body.completed)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    response = _to_response(task)
    if body.completed:
        await request.app.state.event_bus.publish(
            "task.completed", response.model_dump(mode="json", by_alias=True), source="tasks"
        )
    return response
