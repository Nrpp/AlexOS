import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from "@alexos/ui";

export interface StopwatchWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function formatMs(totalMs: number): string {
  const totalCentiseconds = Math.floor(totalMs / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}

/** Fully client-side - no backend needed for timing (same "frontend-
 * only module" precedent as modules/study's Pomodoro). Uses
 * performance.now() rather than accumulating setInterval ticks, so
 * elapsed time stays accurate even if the tab is backgrounded. */
export default function StopwatchWidget(_props: StopwatchWidgetProps) {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setElapsedMs(performance.now() - startedAtRef.current);
    }, 30);
    return () => clearInterval(interval);
  }, [running]);

  const start = () => {
    startedAtRef.current = performance.now() - elapsedMs;
    setRunning(true);
  };

  const stop = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setElapsedMs(0);
    setLaps([]);
  };

  const lap = () => setLaps((current) => [elapsedMs, ...current]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            timer
          </span>
        }
      >
        <CardTitle>Stopwatch</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <span className="text-display font-semibold tabular-nums text-text-primary">{formatMs(elapsedMs)}</span>
        <div className="flex gap-3">
          {running ? (
            <>
              <Button variant="primary" onClick={stop}>
                Stop
              </Button>
              <Button variant="secondary" onClick={lap}>
                Lap
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" onClick={start}>
                Start
              </Button>
              <Button variant="ghost" onClick={reset}>
                Reset
              </Button>
            </>
          )}
        </div>
        {laps.length > 0 ? (
          <ul className="w-full text-caption text-text-secondary">
            {laps.map((lapMs, index) => (
              <li key={laps.length - index} className="flex justify-between border-t border-border py-1">
                <span>Lap {laps.length - index}</span>
                <span className="tabular-nums">{formatMs(lapMs)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

export interface CountdownTimerWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** A separate widget (not the stopwatch above) - counting down from a
 * user-set duration is a distinct enough use case to keep as its own
 * card rather than a mode toggle. */
export function CountdownTimerWidget(_props: CountdownTimerWidgetProps) {
  const [minutesInput, setMinutesInput] = useState("5");
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const endsAtRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const remaining = endsAtRef.current - performance.now();
      if (remaining <= 0) {
        setRemainingMs(0);
        setRunning(false);
      } else {
        setRemainingMs(remaining);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [running]);

  const start = () => {
    const minutes = Number.parseFloat(minutesInput);
    if (Number.isNaN(minutes) || minutes <= 0) return;
    endsAtRef.current = performance.now() + minutes * 60_000;
    setRemainingMs(minutes * 60_000);
    setRunning(true);
  };

  const stop = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setRemainingMs(null);
  };

  const displaySeconds = remainingMs !== null ? Math.ceil(remainingMs / 1000) : null;
  const displayLabel =
    displaySeconds !== null
      ? `${Math.floor(displaySeconds / 60)
          .toString()
          .padStart(2, "0")}:${(displaySeconds % 60).toString().padStart(2, "0")}`
      : "--:--";

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            hourglass_bottom
          </span>
        }
      >
        <CardTitle>Countdown timer</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <span
          className={`text-display font-semibold tabular-nums ${remainingMs === 0 ? "text-danger" : "text-text-primary"}`}
        >
          {displayLabel}
        </span>
        {!running && remainingMs === null ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={minutesInput}
              onChange={(event) => setMinutesInput(event.target.value)}
              aria-label="Minutes"
              className="w-24 text-center"
            />
            <span className="text-caption text-text-secondary">minutes</span>
          </div>
        ) : null}
        <div className="flex gap-3">
          {running ? (
            <Button variant="primary" onClick={stop}>
              Pause
            </Button>
          ) : (
            <Button variant="primary" onClick={start}>
              {remainingMs !== null && remainingMs > 0 ? "Resume" : "Start"}
            </Button>
          )}
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
