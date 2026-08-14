import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface ClassSession {
  id: string;
  className: string;
  day: string;
  startTime: string;
  location: string;
}

export interface ClassScheduleWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function sortSessions(items: ClassSession[]): ClassSession[] {
  return items.slice().sort((a, b) => {
    const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });
}

/** Real, persisted class schedule (see modules/class_schedule/backend). */
export default function ClassScheduleWidget({ apiBaseUrl }: ClassScheduleWidgetProps) {
  const [items, setItems] = useState<ClassSession[] | null>(null);
  const [className, setClassName] = useState("");
  const [day, setDay] = useState(DAYS[0]);
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/class_schedule/items`)
      .then((response) => response.json())
      .then((result: ClassSession[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmedName = className.trim();
    const trimmedLocation = location.trim();
    if (!trimmedName || !startTime || !apiBaseUrl) return;
    setClassName("");
    setStartTime("");
    setLocation("");
    await fetch(`${apiBaseUrl}/api/v1/modules/class_schedule/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ className: trimmedName, day, startTime, location: trimmedLocation }),
    });
    refresh();
  };

  const deleteItem = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/class_schedule/items/${id}`, { method: "DELETE" });
    refresh();
  };

  const sorted = items ? sortSessions(items) : [];

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            event
          </span>
        }
      >
        <CardTitle>Class schedule</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : sorted.length === 0 ? (
        <CardEmpty icon="event" message="No classes scheduled yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {sorted.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-text-primary">{item.className}</p>
                  <p className="text-caption text-text-secondary">
                    {item.day} - {item.startTime}
                    {item.location ? ` - ${item.location}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  aria-label={`Delete ${item.className}`}
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
          value={className}
          onChange={(event) => setClassName(event.target.value)}
          placeholder="Class name..."
          aria-label="New class name"
        />
        <div className="flex gap-2">
          <select
            value={day}
            onChange={(event) => setDay(event.target.value)}
            aria-label="Class day"
            className="h-14 flex-1 rounded-button border border-border bg-background-secondary px-4 text-body text-text-primary outline-none transition-colors duration-base ease-out focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <Input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            aria-label="Class start time"
            className="flex-1"
          />
        </div>
        <div className="flex gap-2">
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location..."
            aria-label="New class location"
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
