import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface SleepEntry {
  id: string;
  date: string; // YYYY-MM-DD
  hours: number;
  note: string;
}

export interface SleepLogWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Deliberately a fixed 3-band scale (short/ok/good), not a smooth
 * gradient - the calendar is meant to be scannable at a glance, not
 * precise (the exact number is in the tooltip and the list below). */
function hoursColorClass(hours: number): string {
  if (hours <= 0) return "bg-background-secondary";
  if (hours < 5) return "bg-danger/60";
  if (hours < 7) return "bg-warning/60";
  return "bg-success/60";
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/** Manual sleep log - no wearable/device integration, just "how many
 * hours did you sleep", stored per calendar date. See the module
 * README for why this exists (a smartwatch app not syncing shouldn't
 * mean losing sleep data entirely). */
export default function SleepLogWidget({ apiBaseUrl }: SleepLogWidgetProps) {
  const [entries, setEntries] = useState<SleepEntry[] | null>(null);
  const [date, setDate] = useState(todayIso());
  const [hours, setHours] = useState("8");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/sleep_log/entries`)
      .then((response) => response.json())
      .then((result: SleepEntry[]) => setEntries(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const byDate = useMemo(() => {
    const map = new Map<string, SleepEntry>();
    (entries ?? []).forEach((entry) => map.set(entry.date, entry));
    return map;
  }, [entries]);

  const monthCells = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
    const cells: (string | null)[] = Array(firstWeekday).fill(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
    return cells;
  }, []);

  const logSleep = async () => {
    const parsedHours = parseFloat(hours);
    if (!apiBaseUrl || !date || Number.isNaN(parsedHours)) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/sleep_log/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, hours: parsedHours }),
    });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            bedtime
          </span>
        }
      >
        <CardTitle>Sleep</CardTitle>
      </CardHeader>

      {entries === null ? (
        <CardLoading />
      ) : (
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label, index) => (
              <div key={`${label}-${index}`} className="text-center text-caption text-text-secondary">
                {label}
              </div>
            ))}
            {monthCells.map((iso, index) => {
              if (!iso) return <div key={`empty-${index}`} />;
              const entry = byDate.get(iso);
              const day = Number(iso.slice(-2));
              return (
                <div
                  key={iso}
                  title={entry ? `${iso}: ${entry.hours}h` : `${iso}: not logged`}
                  className={`flex aspect-square items-center justify-center rounded-md text-caption text-text-primary ${hoursColorClass(entry?.hours ?? 0)}`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {entries.length === 0 ? (
            <div className="mt-3">
              <CardEmpty icon="bedtime" message="No nights logged yet." />
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-1">
              {entries.slice(0, 5).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between text-caption text-text-secondary">
                  <span>{entry.date}</span>
                  <span className="text-text-primary">{entry.hours}h</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}

      <CardFooter className="gap-2">
        <Input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          aria-label="Date"
          className="flex-1"
        />
        <Input
          type="number"
          step={0.5}
          min={0}
          max={24}
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          aria-label="Hours slept"
          className="w-20"
        />
        <Button variant="secondary" onClick={() => void logSleep()}>
          Log
        </Button>
      </CardFooter>
    </Card>
  );
}
