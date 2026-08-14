import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@alexos/ui";

export interface TypingSpeedTestWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

// Real short pangram-style passages, ~30-40 words each.
const PASSAGES = [
  "The quick brown fox jumps over the lazy dog while the sun sets slowly behind the distant hills, painting the sky in shades of orange and purple as evening falls across the quiet valley.",
  "Pack my box with five dozen liquid jugs before the storm arrives tonight, and remember to check the weather forecast twice, because the roads near the river tend to flood after heavy rain.",
  "A wizard's job is to vex chumps quickly in fog, but even skilled wizards need practice, patience, and a steady hand to master every spell before facing a real opponent in the arena.",
  "Bright vixens jump; dozy fowl quack when the farmer opens the gate each morning, feeding the animals grain and fresh water before heading out to till the fields under the warm summer sun.",
];

function pickPassage(exclude?: string): string {
  const options = PASSAGES.filter((passage) => passage !== exclude);
  const pool = options.length > 0 ? options : PASSAGES;
  // Non-null: pool is always non-empty (PASSAGES is a non-empty literal).
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function computeAccuracy(target: string, typed: string): number {
  if (typed.length === 0) return 100;
  let correct = 0;
  for (let i = 0; i < typed.length; i += 1) {
    if (typed[i] === target[i]) correct += 1;
  }
  return Math.round((correct / typed.length) * 100);
}

function countCorrectChars(target: string, typed: string): number {
  let correct = 0;
  for (let i = 0; i < typed.length; i += 1) {
    if (typed[i] === target[i]) correct += 1;
  }
  return correct;
}

/** Fully client-side - real WPM/accuracy math against a local passage. */
export default function TypingSpeedTestWidget(_props: TypingSpeedTestWidgetProps) {
  const [passage, setPassage] = useState(() => pickPassage());
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);

  const elapsedSeconds = startedAt && now ? Math.max((now - startedAt) / 1000, 0.001) : 0;

  const wpm = useMemo(() => {
    if (!startedAt) return 0;
    const correctChars = countCorrectChars(passage, typed);
    const minutes = elapsedSeconds / 60;
    if (minutes <= 0) return 0;
    return Math.round(correctChars / 5 / minutes);
  }, [passage, typed, startedAt, elapsedSeconds]);

  const accuracy = useMemo(() => computeAccuracy(passage, typed), [passage, typed]);
  const isComplete = typed.length >= passage.length;

  const handleChange = (value: string) => {
    if (startedAt === null && value.length > 0) {
      const start = Date.now();
      setStartedAt(start);
      setNow(start);
    }
    if (startedAt !== null) setNow(Date.now());
    setTyped(value.slice(0, passage.length));
  };

  const reset = () => {
    setPassage(pickPassage(passage));
    setTyped("");
    setStartedAt(null);
    setNow(null);
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            keyboard
          </span>
        }
      >
        <CardTitle>Typing speed test</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="rounded-button border border-border bg-background-secondary p-3 text-body text-text-secondary">
          {passage.split("").map((char, index) => {
            const typedChar = typed[index];
            let className = "text-text-secondary";
            if (typedChar !== undefined) {
              className = typedChar === char ? "text-success" : "bg-danger/20 text-danger";
            }
            return (
              <span key={`${char}-${index}`} className={className}>
                {char}
              </span>
            );
          })}
        </p>

        <textarea
          value={typed}
          onChange={(event) => handleChange(event.target.value)}
          disabled={isComplete}
          placeholder="Start typing to begin the timer..."
          aria-label="Type the passage here"
          rows={4}
          className="w-full resize-none rounded-button border border-border bg-background-secondary px-3 py-2 text-body text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-caption text-text-secondary">WPM</span>
              <span className="text-title font-semibold tabular-nums text-text-primary">{wpm}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-caption text-text-secondary">Accuracy</span>
              <span className="text-title font-semibold tabular-nums text-text-primary">{accuracy}%</span>
            </div>
          </div>
          <Button variant="secondary" onClick={reset}>
            Reset
          </Button>
        </div>

        {isComplete ? <p className="text-center text-caption text-success">Passage complete!</p> : null}
      </CardContent>
    </Card>
  );
}
