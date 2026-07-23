import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading } from "@alexos/ui";

interface CalendarEvent {
  time: string;
  title: string;
}

interface EventsResponse {
  configured: boolean;
  events: CalendarEvent[];
}

export interface CalendarWidgetProps {
  /** Unused - no webhook support yet, so nothing pushes calendar changes. See the module README. */
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real events via Google Calendar - see the module README to connect yours. */
export default function CalendarWidget({ apiBaseUrl }: CalendarWidgetProps) {
  const [data, setData] = useState<EventsResponse | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/calendar/events/today`)
      .then((response) => response.json())
      .then((result: EventsResponse) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData({ configured: false, events: [] });
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
      {data === null ? (
        <CardLoading />
      ) : !data.configured ? (
        <CardEmpty icon="event_busy" message="Google Calendar isn't connected yet - see modules/calendar/README.md." />
      ) : data.events.length === 0 ? (
        <CardEmpty icon="event_busy" message="No events today." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {data.events.map((event) => (
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
