import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@alexos/ui";

export interface WorldClockWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

// No backend, so no config.json to read (same as modules/study's
// Pomodoro) - a fixed, broadly useful default spread of timezones.
const ZONES: Array<{ label: string; timeZone: string }> = [
  { label: "Local", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  { label: "London", timeZone: "Europe/London" },
  { label: "New York", timeZone: "America/New_York" },
  { label: "Tokyo", timeZone: "Asia/Tokyo" },
  { label: "Sydney", timeZone: "Australia/Sydney" },
];

function formatZoneTime(now: Date, timeZone: string): string {
  return now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone, hour12: false });
}

function formatZoneDate(now: Date, timeZone: string): string {
  return now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone });
}

/** Fully client-side - Intl.DateTimeFormat with a `timeZone` option
 * gives real per-zone time with no backend or external service. */
export default function WorldClockWidget(_props: WorldClockWidgetProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            public
          </span>
        }
      >
        <CardTitle>World clock</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {ZONES.map((zone) => (
            <li key={zone.timeZone} className="flex items-center justify-between">
              <div>
                <p className="text-body text-text-primary">{zone.label}</p>
                <p className="text-caption text-text-secondary">{formatZoneDate(now, zone.timeZone)}</p>
              </div>
              <span className="text-title font-semibold tabular-nums text-text-primary">
                {formatZoneTime(now, zone.timeZone)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
