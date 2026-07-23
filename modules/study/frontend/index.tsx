import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, Button } from "@alexos/ui";

export interface PomodoroWidgetProps {
  /** Unused - this module has no backend, see the module README. */
  eventBus?: unknown;
  apiBaseUrl?: string;
}

type Phase = "work" | "break";

// Mirrors config.json's intended defaults - see the module README for
// why these are hardcoded rather than fetched.
const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

const PHASE_LABEL: Record<Phase, string> = { work: "Focus", break: "Break" };
const PHASE_SECONDS: Record<Phase, number> = {
  work: WORK_MINUTES * 60,
  break: BREAK_MINUTES * 60,
};

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/** Fully client-side - no backend, no external data, see the module README. */
export default function PomodoroWidget(_props: PomodoroWidgetProps) {
  const [phase, setPhase] = useState<Phase>("work");
  const [remainingSeconds, setRemainingSeconds] = useState(PHASE_SECONDS.work);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current > 1) return current - 1;
        setPhase((currentPhase) => (currentPhase === "work" ? "break" : "work"));
        return 0;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  // Once the countdown lands on 0, the phase has already flipped above -
  // load the new phase's duration on the next render.
  useEffect(() => {
    if (remainingSeconds === 0) {
      setRemainingSeconds(PHASE_SECONDS[phase]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const reset = () => {
    setRunning(false);
    setPhase("work");
    setRemainingSeconds(PHASE_SECONDS.work);
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
        <CardTitle>Pomodoro</CardTitle>
        <CardSubtitle>{PHASE_LABEL[phase]}</CardSubtitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <span className="text-display font-semibold tabular-nums text-text-primary">
          {formatCountdown(remainingSeconds)}
        </span>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => setRunning((current) => !current)}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              {running ? "pause" : "play_arrow"}
            </span>
            {running ? "Pause" : "Start"}
          </Button>
          <Button variant="ghost" onClick={reset}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              refresh
            </span>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
