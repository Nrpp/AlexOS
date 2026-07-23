"""In-memory task store. Lost on restart - see the module README for the
path to real persistence."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class Task:
    id: str
    title: str
    completed: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


_tasks: dict[str, Task] = {}


def list_tasks() -> list[Task]:
    return sorted(_tasks.values(), key=lambda task: (task.completed, task.created_at))


def create_task(title: str) -> Task:
    task = Task(id=str(uuid.uuid4()), title=title)
    _tasks[task.id] = task
    return task


def set_completed(task_id: str, completed: bool) -> Task | None:
    task = _tasks.get(task_id)
    if task is None:
        return None
    task.completed = completed
    return task
