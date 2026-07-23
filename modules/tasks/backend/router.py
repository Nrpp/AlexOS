from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import create_task, list_tasks, set_completed, task_to_payload

router = APIRouter()


class CreateTaskRequest(BaseModel):
    title: str


class UpdateTaskRequest(BaseModel):
    completed: bool


@router.get("/tasks")
async def get_tasks() -> dict:
    try:
        tasks = await list_tasks()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Google Tasks.") from error
    if tasks is None:
        return {"configured": False, "tasks": []}
    return {"configured": True, "tasks": [task_to_payload(task) for task in tasks]}


@router.post("/tasks", status_code=201)
async def post_task(body: CreateTaskRequest, request: Request) -> dict:
    try:
        task = await create_task(body.title)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Google Tasks.") from error
    if task is None:
        raise HTTPException(status_code=404, detail="Google Tasks isn't configured.")
    payload = task_to_payload(task)
    await request.app.state.event_bus.publish("task.created", payload, source="tasks")
    return payload


@router.patch("/tasks/{task_id}")
async def patch_task(task_id: str, body: UpdateTaskRequest, request: Request) -> dict:
    try:
        task = await set_completed(task_id, body.completed)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach Google Tasks.") from error
    if task is None:
        raise HTTPException(status_code=404, detail="Google Tasks isn't configured, or the task wasn't found.")
    payload = task_to_payload(task)
    if body.completed:
        await request.app.state.event_bus.publish("task.completed", payload, source="tasks")
    return payload
