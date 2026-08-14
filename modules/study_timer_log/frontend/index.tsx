import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface StudySession {
  id: string;
  subject: string;
  minutes: number;
  date: string;
}

export interface StudyTimerLogWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

/** Real, persisted study timer log (see modules/study_timer_log/backend). */
export default function StudyTimerLogWidget({ apiBaseUrl }: StudyTimerLogWidgetProps) {
  const [items, setItems] = useState<StudySession[] | null>(null);
  const [subject, setSubject] = useState("");
  const [minutes, setMinutes] = useState("");
  const [date, setDate] = useState(today());

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/study_timer_log/items`)
      .then((response) => response.json())
      .then((result: StudySession[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmedSubject = subject.trim();
    const minutesValue = Number(minutes);
    if (!trimmedSubject || !date || !apiBaseUrl || Number.isNaN(minutesValue) || minutesValue <= 0) return;
    setSubject("");
    setMinutes("");
    await fetch(`${apiBaseUrl}/api/v1/modules/study_timer_log/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: trimmedSubject, minutes: minutesValue, date }),
    });
    refresh();
  };

  const deleteItem = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/study_timer_log/items/${id}`, { method: "DELETE" });
    refresh();
  };

  const sorted = (items ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const totalMinutes = (items ?? []).reduce((sum, item) => sum + item.minutes, 0);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            hourglass_bottom
          </span>
        }
        actions={
          items && items.length > 0 ? (
            <span className="text-caption text-text-secondary">Total: {formatDuration(totalMinutes)}</span>
          ) : undefined
        }
      >
        <CardTitle>Study timer log</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : sorted.length === 0 ? (
        <CardEmpty icon="hourglass_bottom" message="No study sessions logged yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {sorted.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-text-primary">{item.subject}</p>
                  <p className="text-caption text-text-secondary">
                    {item.date} - {formatDuration(item.minutes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  aria-label={`Delete ${item.subject} session`}
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
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Subject..."
          aria-label="New study session subject"
        />
        <div className="flex gap-2">
          <Input
            type="number"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            placeholder="Minutes"
            aria-label="Minutes studied"
            className="flex-1"
          />
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Study session date"
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
