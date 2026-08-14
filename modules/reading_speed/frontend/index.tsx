import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input } from "@alexos/ui";

export interface ReadingSpeedWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function formatMinutesSeconds(totalMinutes: number): string {
  const totalSeconds = Math.round(totalMinutes * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Fully client-side - real word count and reading-time math. */
export default function ReadingSpeedWidget(_props: ReadingSpeedWidgetProps) {
  const [text, setText] = useState("");
  const [wpm, setWpm] = useState("200");

  const wordCount = useMemo(() => countWords(text), [text]);

  const readingTime = useMemo(() => {
    const rate = Number.parseFloat(wpm);
    if (Number.isNaN(rate) || rate <= 0) return null;
    return wordCount / rate;
  }, [wordCount, wpm]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            menu_book
          </span>
        }
      >
        <CardTitle>Reading speed</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste or type text here..."
          aria-label="Text to estimate reading time for"
          rows={6}
          className="w-full resize-none rounded-button border border-border bg-background-secondary px-3 py-2 text-body text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />

        <div className="flex items-center gap-2">
          <label htmlFor="reading-speed-wpm" className="text-caption text-text-secondary">
            Reading speed (WPM)
          </label>
          <Input
            id="reading-speed-wpm"
            type="number"
            value={wpm}
            onChange={(event) => setWpm(event.target.value)}
            aria-label="Words per minute"
            className="w-24"
          />
        </div>
        <input
          type="range"
          min={100}
          max={500}
          step={10}
          value={Number.parseFloat(wpm) || 200}
          onChange={(event) => setWpm(event.target.value)}
          aria-label="Reading speed slider"
          className="w-full accent-accent-primary"
        />

        <div className="flex items-center justify-between gap-3 rounded-button border border-border bg-background-secondary px-3 py-3">
          <div className="flex flex-col">
            <span className="text-caption text-text-secondary">Word count</span>
            <span className="text-title font-semibold tabular-nums text-text-primary">{wordCount}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-caption text-text-secondary">Estimated reading time</span>
            <span className="text-title font-semibold tabular-nums text-text-primary">
              {readingTime !== null ? formatMinutesSeconds(readingTime) : "-"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
