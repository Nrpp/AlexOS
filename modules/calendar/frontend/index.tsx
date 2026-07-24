import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardError } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface CalendarEvent {
  time: string;
  title: string;
}

interface EventsResponse {
  configured: boolean;
  events: CalendarEvent[];
}

export interface CalendarWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

/** Real events via Google Calendar - see the module README to connect
 * yours. Refetches on "calendar.updated" (published by a background
 * poll every ~2 minutes - see modules/calendar/backend/__init__.py) so
 * events added outside AlexOS show up without a manual page reload. */
export default function CalendarWidget({ eventBus, apiBaseUrl }: CalendarWidgetProps) {
  const [data, setData] = useState<EventsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/calendar/events/today`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail || `Request failed (${response.status})`);
        }
        setError(null);
        return response.json();
      })
      .then((result: EventsResponse) => setData(result))
      .catch((err: Error) => setError(err.message));
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "calendar.updated", (payload) => setData(payload as EventsResponse));

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
      {error ? (
        <CardError message={error} onRetry={refresh} />
      ) : data === null ? (
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
