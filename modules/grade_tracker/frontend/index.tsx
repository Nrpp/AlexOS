import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface Grade {
  id: string;
  title: string;
  score: number;
  maxScore: number;
}

export interface GradeTrackerWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function formatPercent(score: number, maxScore: number): string {
  if (maxScore <= 0) return "-";
  return `${Math.round((score / maxScore) * 100)}%`;
}

/** Real, persisted grade tracker (see modules/grade_tracker/backend). */
export default function GradeTrackerWidget({ apiBaseUrl }: GradeTrackerWidgetProps) {
  const [items, setItems] = useState<Grade[] | null>(null);
  const [title, setTitle] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/grade_tracker/items`)
      .then((response) => response.json())
      .then((result: Grade[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmedTitle = title.trim();
    const scoreValue = Number(score);
    const maxScoreValue = Number(maxScore);
    if (!trimmedTitle || !apiBaseUrl || Number.isNaN(scoreValue) || Number.isNaN(maxScoreValue)) return;
    setTitle("");
    setScore("");
    setMaxScore("");
    await fetch(`${apiBaseUrl}/api/v1/modules/grade_tracker/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmedTitle, score: scoreValue, maxScore: maxScoreValue }),
    });
    refresh();
  };

  const deleteItem = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/grade_tracker/items/${id}`, { method: "DELETE" });
    refresh();
  };

  const totals = (items ?? []).reduce(
    (acc, item) => ({ score: acc.score + item.score, maxScore: acc.maxScore + item.maxScore }),
    { score: 0, maxScore: 0 },
  );
  const average = totals.maxScore > 0 ? Math.round((totals.score / totals.maxScore) * 100) : null;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            grade
          </span>
        }
        actions={
          average !== null ? (
            <span className="text-caption text-text-secondary">Average: {average}%</span>
          ) : undefined
        }
      >
        <CardTitle>Grade tracker</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : items.length === 0 ? (
        <CardEmpty icon="grade" message="No grades logged yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-body text-text-primary">{item.title}</span>
                <span className="shrink-0 text-caption text-text-secondary">
                  {item.score}/{item.maxScore} ({formatPercent(item.score, item.maxScore)})
                </span>
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
          placeholder="Title (e.g. Midterm 1)..."
          aria-label="New grade title"
        />
        <div className="flex gap-2">
          <Input
            type="number"
            value={score}
            onChange={(event) => setScore(event.target.value)}
            placeholder="Score"
            aria-label="Score"
            className="flex-1"
          />
          <Input
            type="number"
            value={maxScore}
            onChange={(event) => setMaxScore(event.target.value)}
            placeholder="Out of"
            aria-label="Max score"
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
