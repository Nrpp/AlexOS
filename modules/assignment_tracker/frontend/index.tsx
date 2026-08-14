import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
}

export interface AssignmentTrackerWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real, persisted assignment tracker (see modules/assignment_tracker/backend). */
export default function AssignmentTrackerWidget({ apiBaseUrl }: AssignmentTrackerWidgetProps) {
  const [items, setItems] = useState<Assignment[] | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/assignment_tracker/items`)
      .then((response) => response.json())
      .then((result: Assignment[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmed = title.trim();
    if (!trimmed || !dueDate || !apiBaseUrl) return;
    setTitle("");
    setDueDate("");
    await fetch(`${apiBaseUrl}/api/v1/modules/assignment_tracker/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed, dueDate }),
    });
    refresh();
  };

  const toggleItem = async (item: Assignment) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/assignment_tracker/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
    refresh();
  };

  const deleteItem = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/assignment_tracker/items/${id}`, { method: "DELETE" });
    refresh();
  };

  const clearCompleted = async () => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/assignment_tracker/items/clear-completed`, { method: "POST" });
    refresh();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") void addItem();
  };

  const sorted = (items ?? []).slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const hasCompleted = items?.some((item) => item.done) ?? false;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            assignment
          </span>
        }
        actions={
          hasCompleted ? (
            <button type="button" onClick={() => void clearCompleted()} className="text-caption text-accent-primary">
              Clear completed
            </button>
          ) : undefined
        }
      >
        <CardTitle>Assignment tracker</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : sorted.length === 0 ? (
        <CardEmpty icon="assignment" message="No assignments yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {sorted.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void toggleItem(item)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-base ease-out ${
                      item.done
                        ? "border-success bg-success/20 text-success"
                        : "border-border text-transparent hover:border-accent-primary"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base" aria-hidden>
                      check
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-body ${item.done ? "text-text-secondary line-through" : "text-text-primary"}`}
                    >
                      {item.title}
                    </span>
                    <span className="block text-caption text-text-secondary">Due {item.dueDate}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  aria-label={`Delete ${item.title}`}
                  className="shrink-0 text-text-secondary transition-colors duration-base ease-out hover:text-danger"
                >
                  <span className="material-symbols-rounded text-lg" aria-hidden>
                    close
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <CardFooter className="flex-col items-stretch gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Assignment title..."
          aria-label="New assignment title"
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label="Due date"
            className="flex-1"
          />
          <Button variant="secondary" onClick={() => void addItem()}>
            Add
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
