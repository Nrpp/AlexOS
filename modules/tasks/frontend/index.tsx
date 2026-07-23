import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardEmpty,
  CardLoading,
  CardFooter,
  Input,
  Button,
} from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface TasksWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

/** Refetches on task.created/task.completed rather than patching local
 * state, so it stays correct no matter where a task was created. */
export default function TasksWidget({ eventBus, apiBaseUrl }: TasksWidgetProps) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/tasks/tasks`)
      .then((response) => response.json())
      .then((data: Task[]) => setTasks(data))
      .catch(() => setTasks((current) => current ?? []));
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "task.created", refresh);
  useEventBus(eventBus, "task.completed", refresh);

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title || !apiBaseUrl) return;
    setNewTitle("");
    await fetch(`${apiBaseUrl}/api/v1/modules/tasks/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    refresh();
  };

  const toggleTask = async (task: Task) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/tasks/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    refresh();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") void addTask();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            checklist
          </span>
        }
      >
        <CardTitle>Today&apos;s tasks</CardTitle>
      </CardHeader>

      {tasks === null ? (
        <CardLoading />
      ) : tasks.length === 0 ? (
        <CardEmpty icon="task_alt" message="No upcoming tasks." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void toggleTask(task)}
                  aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-base ease-out ${
                    task.completed
                      ? "border-success bg-success/20 text-success"
                      : "border-border text-transparent hover:border-accent-primary"
                  }`}
                >
                  <span className="material-symbols-rounded text-base" aria-hidden>
                    check
                  </span>
                </button>
                <span
                  className={`text-body ${task.completed ? "text-text-secondary line-through" : "text-text-primary"}`}
                >
                  {task.title}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <CardFooter className="justify-start gap-2">
        <Input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task..."
          aria-label="New task title"
          className="flex-1"
        />
        <Button variant="secondary" onClick={() => void addTask()}>
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
