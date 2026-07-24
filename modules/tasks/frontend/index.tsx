import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardEmpty,
  CardLoading,
  CardError,
  CardFooter,
  Input,
  Button,
} from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface TasksResponse {
  configured: boolean;
  tasks: Task[];
}

export interface TasksWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

/** Real tasks via Google Tasks - see the module README to connect
 * yours. Refetches on task.created/task.completed for instant feedback
 * on actions taken here, and on tasks.updated (a background poll every
 * ~60s - see modules/tasks/backend/__init__.py) so a task added or
 * completed outside AlexOS shows up without a manual page reload. */
export default function TasksWidget({ eventBus, apiBaseUrl }: TasksWidgetProps) {
  const [data, setData] = useState<TasksResponse | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/tasks/tasks`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail || `Request failed (${response.status})`);
        }
        setError(null);
        return response.json();
      })
      .then((result: TasksResponse) => setData(result))
      .catch((err: Error) => setError(err.message));
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "task.created", refresh);
  useEventBus(eventBus, "task.completed", refresh);
  useEventBus(eventBus, "tasks.updated", (payload) => setData(payload as TasksResponse));

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

      {error ? (
        <CardError message={error} onRetry={refresh} />
      ) : data === null ? (
        <CardLoading />
      ) : !data.configured ? (
        <CardEmpty icon="task_alt" message="Google Tasks isn't connected yet - see modules/tasks/README.md." />
      ) : data.tasks.length === 0 ? (
        <CardEmpty icon="task_alt" message="No upcoming tasks." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {data.tasks.map((task) => (
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

      {data?.configured ? (
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
      ) : null}
    </Card>
  );
}
