import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from "@alexos/ui";

export interface BreakReminderWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

type Phase = "work" | "break";

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function notify(title: string, body: string) {
  if (typeof window === "undefined" || typeof window.Notification === "undefined") return;
  if (window.Notification.permission !== "granted") return;
  try {
    // eslint-disable-next-line no-new
    new window.Notification(title, { body });
  } catch {
    // Notifications may be blocked by the platform - fail silently.
  }
}

/** Fully client-side - Pomodoro-style interval timer, no backend needed. */
export default function BreakReminderWidget(_props: BreakReminderWidgetProps) {
  const [workMinutes, setWorkMinutes] = useState("25");
  const [breakMinutes, setBreakMinutes] = useState("5");
  const [phase, setPhase] = useState<Phase>("work");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return undefined;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) return current - 1;

        setPhase((currentPhase) => {
          if (currentPhase === "work") {
            setCompletedCycles((count) => count + 1);
            notify("Work session complete", "Time for a break.");
            const breakSeconds = Math.max(Number.parseInt(breakMinutes, 10) || 5, 1) * 60;
            setSecondsLeft(breakSeconds);
            return "break";
          }
          notify("Break complete", "Time to get back to work.");
          const workSeconds = Math.max(Number.parseInt(workMinutes, 10) || 25, 1) * 60;
          setSecondsLeft(workSeconds);
          return "work";
        });
        return 0;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, workMinutes, breakMinutes]);

  const requestNotificationPermission = () => {
    if (typeof window === "undefined" || typeof window.Notification === "undefined") return;
    if (window.Notification.permission === "default") {
      void window.Notification.requestPermission();
    }
  };

  const start = () => {
    requestNotificationPermission();
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setPhase("work");
    setSecondsLeft(Math.max(Number.parseInt(workMinutes, 10) || 25, 1) * 60);
  };

  const applyWorkMinutes = (value: string) => {
    setWorkMinutes(value);
    if (!running && phase === "work") {
      setSecondsLeft(Math.max(Number.parseInt(value, 10) || 25, 1) * 60);
    }
  };

  const applyBreakMinutes = (value: string) => {
    setBreakMinutes(value);
    if (!running && phase === "break") {
      setSecondsLeft(Math.max(Number.parseInt(value, 10) || 5, 1) * 60);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            timer
          </span>
        }
      >
        <CardTitle>Break reminder</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="break-reminder-work" className="text-caption text-text-secondary">
              Work (min)
            </label>
            <Input
              id="break-reminder-work"
              type="number"
              value={workMinutes}
              onChange={(event) => applyWorkMinutes(event.target.value)}
              disabled={running}
              min={1}
              aria-label="Work minutes"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="break-reminder-break" className="text-caption text-text-secondary">
              Break (min)
            </label>
            <Input
              id="break-reminder-break"
              type="number"
              value={breakMinutes}
              onChange={(event) => applyBreakMinutes(event.target.value)}
              disabled={running}
              min={1}
              aria-label="Break minutes"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 rounded-button border border-border bg-background-secondary py-6">
          <span className="text-caption uppercase tracking-wide text-text-secondary">
            {phase === "work" ? "Work" : "Break"}
          </span>
          <span className="text-heading font-semibold tabular-nums text-text-primary">
            {formatTime(secondsLeft)}
          </span>
        </div>

        <div className="flex gap-2">
          {running ? (
            <Button variant="secondary" onClick={pause} className="flex-1">
              Pause
            </Button>
          ) : (
            <Button variant="primary" onClick={start} className="flex-1">
              Start
            </Button>
          )}
          <Button variant="ghost" onClick={reset} className="flex-1">
            Reset
          </Button>
        </div>

        <p className="text-center text-caption text-text-secondary">
          Completed work cycles: {completedCycles}
        </p>
      </CardContent>
    </Card>
  );
}
