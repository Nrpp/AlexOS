import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@alexos/ui";

export interface StudyBreakSuggesterWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

interface BreakActivity {
  text: string;
  icon: string;
}

// Real, sensible short-break suggestions.
const ACTIVITIES: BreakActivity[] = [
  { text: "Do 10 jumping jacks", icon: "directions_run" },
  { text: "Step outside for fresh air", icon: "air" },
  { text: "Stretch your neck and shoulders", icon: "self_improvement" },
  { text: "Drink a glass of water", icon: "water_drop" },
  { text: "Look at something 20 feet away for 20 seconds (20-20-20 rule)", icon: "visibility" },
  { text: "Take five deep breaths", icon: "spa" },
  { text: "Walk around the room", icon: "directions_walk" },
  { text: "Tidy up your desk for a minute", icon: "cleaning_services" },
  { text: "Do a quick shoulder roll and neck stretch", icon: "accessibility_new" },
  { text: "Grab a healthy snack", icon: "restaurant" },
  { text: "Text or call a friend to say hi", icon: "chat" },
  { text: "Stand up and touch your toes", icon: "fitness_center" },
  { text: "Listen to one favorite song", icon: "music_note" },
  { text: "Close your eyes and rest for a minute", icon: "bedtime" },
  { text: "Water a plant or tidy a small space", icon: "yard" },
];

function pickActivity(exclude?: BreakActivity): BreakActivity {
  const options = ACTIVITIES.filter((activity) => activity.text !== exclude?.text);
  const pool = options.length > 0 ? options : ACTIVITIES;
  // Non-null: pool is always non-empty (ACTIVITIES is a non-empty literal).
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const DEFAULT_SECONDS = 5 * 60;

/** Fully client-side - random pick from a local list plus a countdown timer. */
export default function StudyBreakSuggesterWidget(_props: StudyBreakSuggesterWidgetProps) {
  const [activity, setActivity] = useState<BreakActivity | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return undefined;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const suggest = () => {
    setActivity((current) => pickActivity(current ?? undefined));
    setSecondsLeft(DEFAULT_SECONDS);
    setRunning(false);
  };

  const toggleTimer = () => setRunning((current) => !current);

  const resetTimer = () => {
    setSecondsLeft(DEFAULT_SECONDS);
    setRunning(false);
  };

  const progressLabel = useMemo(() => formatTime(secondsLeft), [secondsLeft]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            self_improvement
          </span>
        }
      >
        <CardTitle>Study break suggester</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {activity ? (
          <div className="flex items-center gap-3 rounded-button border border-border bg-background-secondary p-4">
            <span className="material-symbols-rounded text-2xl text-accent-primary" aria-hidden>
              {activity.icon}
            </span>
            <p className="text-body text-text-primary">{activity.text}</p>
          </div>
        ) : (
          <p className="text-caption text-text-secondary">Tap the button for a suggested break activity.</p>
        )}

        <Button variant="primary" onClick={suggest}>
          Suggest a break
        </Button>

        {activity ? (
          <div className="flex items-center justify-between gap-3 rounded-button border border-border bg-background-secondary px-3 py-3">
            <span className="text-title font-semibold tabular-nums text-text-primary">{progressLabel}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={toggleTimer} className="h-10 min-h-0 px-3 text-caption">
                {running ? "Stop" : "Start"}
              </Button>
              <Button variant="ghost" onClick={resetTimer} className="h-10 min-h-0 px-3 text-caption">
                Reset
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
