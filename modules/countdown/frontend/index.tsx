import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface Countdown {
  id: string;
  title: string;
  targetIso: string;
}

export interface CountdownWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function formatRemaining(targetIso: string, now: number): string {
  const diffMs = new Date(targetIso).getTime() - now;
  if (diffMs <= 0) return "Now";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function CountdownWidget({ apiBaseUrl }: CountdownWidgetProps) {
  const [countdowns, setCountdowns] = useState<Countdown[] | null>(null);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/countdown/countdowns`)
      .then((response) => response.json())
      .then((result: Countdown[]) => setCountdowns(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const addCountdown = async () => {
    const trimmed = title.trim();
    if (!trimmed || !target || !apiBaseUrl) return;
    setTitle("");
    setTarget("");
    await fetch(`${apiBaseUrl}/api/v1/modules/countdown/countdowns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed, targetIso: new Date(target).toISOString() }),
    });
    refresh();
  };

  const removeCountdown = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/countdown/countdowns/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            hourglass_top
          </span>
        }
      >
        <CardTitle>Countdown</CardTitle>
      </CardHeader>

      {countdowns === null ? (
        <CardLoading />
      ) : countdowns.length === 0 ? (
        <CardEmpty icon="hourglass_top" message="No countdowns yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {countdowns.map((countdown) => (
              <li key={countdown.id} className="flex items-center justify-between gap-3">
                <span className="text-body text-text-primary">{countdown.title}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-caption font-semibold text-accent-primary">
                    {formatRemaining(countdown.targetIso, now)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeCountdown(countdown.id)}
                    aria-label={`Remove ${countdown.title}`}
                    className="text-text-secondary hover:text-danger"
                  >
                    <span className="material-symbols-rounded text-lg" aria-hidden>
                      close
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <CardFooter className="flex-col items-stretch gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Event title..."
          aria-label="Event title"
        />
        <div className="flex gap-2">
          <Input
            type="datetime-local"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            aria-label="Target date and time"
            className="flex-1"
          />
          <Button variant="secondary" onClick={() => void addCountdown()}>
            Add
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
