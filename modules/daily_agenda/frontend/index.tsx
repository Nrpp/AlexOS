import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface AgendaEntry {
  id: string;
  date: string;
  time: string;
  text: string;
}

export interface DailyAgendaWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyAgendaWidget({ apiBaseUrl }: DailyAgendaWidgetProps) {
  const [entries, setEntries] = useState<AgendaEntry[] | null>(null);
  const [time, setTime] = useState("09:00");
  const [text, setText] = useState("");
  const today = todayIso();

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/daily_agenda/entries?date=${today}`)
      .then((response) => response.json())
      .then((result: AgendaEntry[]) => setEntries(result))
      .catch(() => undefined);
  }, [apiBaseUrl, today]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addEntry = async () => {
    const trimmed = text.trim();
    if (!trimmed || !time || !apiBaseUrl) return;
    setText("");
    await fetch(`${apiBaseUrl}/api/v1/modules/daily_agenda/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, time, text: trimmed }),
    });
    refresh();
  };

  const removeEntry = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/daily_agenda/entries/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            event_note
          </span>
        }
      >
        <CardTitle>Today's agenda</CardTitle>
      </CardHeader>

      {entries === null ? (
        <CardLoading />
      ) : entries.length === 0 ? (
        <CardEmpty icon="event_note" message="Nothing on the agenda today." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-caption font-semibold text-accent-primary">{entry.time}</span>
                  <span className="text-body text-text-primary">{entry.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void removeEntry(entry.id)}
                  aria-label="Remove entry"
                  className="text-text-secondary hover:text-danger"
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
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          aria-label="Time"
          className="w-28"
        />
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void addEntry()}
          placeholder="What's happening..."
          aria-label="Entry description"
          className="flex-1"
        />
        <Button variant="secondary" onClick={() => void addEntry()}>
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
