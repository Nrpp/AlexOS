import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading } from "@alexos/ui";

interface CalendarEvent {
  time: string;
  title: string;
}

export interface CalendarWidgetProps {
  /** Unused - nothing pushes calendar changes yet, see the module README. */
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Static for now: fetches today's seeded events once on mount. */
export default function CalendarWidget({ apiBaseUrl }: CalendarWidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/calendar/events/today`)
      .then((response) => response.json())
      .then((data: CalendarEvent[]) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            calendar_today
          </span>
        }
      >
        <CardTitle>Today&apos;s calendar</CardTitle>
      </CardHeader>
      {events === null ? (
        <CardLoading />
      ) : events.length === 0 ? (
        <CardEmpty icon="event_busy" message="No events today." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {events.map((event) => (
              <li key={`${event.time}-${event.title}`} className="flex items-center gap-3">
                <span className="w-12 shrink-0 tabular-nums text-caption text-text-secondary">
                  {event.time}
                </span>
                <span className="text-body text-text-primary">{event.title}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
