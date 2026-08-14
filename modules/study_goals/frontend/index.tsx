import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface StudyGoal {
  id: string;
  text: string;
  done: boolean;
}

export interface StudyGoalsWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real, persisted study goals (see modules/study_goals/backend). */
export default function StudyGoalsWidget({ apiBaseUrl }: StudyGoalsWidgetProps) {
  const [items, setItems] = useState<StudyGoal[] | null>(null);
  const [text, setText] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/study_goals/items`)
      .then((response) => response.json())
      .then((result: StudyGoal[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmed = text.trim();
    if (!trimmed || !apiBaseUrl) return;
    setText("");
    await fetch(`${apiBaseUrl}/api/v1/modules/study_goals/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    });
    refresh();
  };

  const toggleItem = async (item: StudyGoal) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/study_goals/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
    refresh();
  };

  const deleteItem = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/study_goals/items/${id}`, { method: "DELETE" });
    refresh();
  };

  const clearCompleted = async () => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/study_goals/items/clear-completed`, { method: "POST" });
    refresh();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") void addItem();
  };

  const hasCompleted = items?.some((item) => item.done) ?? false;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            flag
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
        <CardTitle>Study goals</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : items.length === 0 ? (
        <CardEmpty icon="flag" message="No study goals yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
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
                  <span
                    className={`text-body ${item.done ? "text-text-secondary line-through" : "text-text-primary"}`}
                  >
                    {item.text}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  aria-label={`Delete ${item.text}`}
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

      <CardFooter className="gap-2">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a goal..."
          aria-label="New study goal"
          className="flex-1"
        />
        <Button variant="secondary" onClick={() => void addItem()}>
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
