import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardError, Button } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface CalendarEvent {
  time: string;
  title: string;
  date: string; // YYYY-MM-DD, in the calendar's configured timezone
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

// --- Month view -------------------------------------------------------

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Every cell CalendarMonthWidget needs to render one month, Monday-first,
 * padded with `null` before day 1 so the grid lines up under the weekday
 * header - same approach as modules/sleep_log's month grid. */
function monthCells(year: number, month: number): (string | null)[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday-first
  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${pad2(month)}-${pad2(day)}`);
  }
  return cells;
}

/** Full month grid, with prev/next navigation and a "Today" jump-back -
 * the complement to the default widget's "today only" list. Fetches its
 * own month on demand (on mount and on navigation) rather than
 * subscribing to "calendar.updated" (that event carries the *today*
 * payload from the background poll - a different shape - so re-using it
 * here would silently show the wrong data whenever the poll fires while
 * a different month is on screen). */
export function CalendarMonthWidget({ apiBaseUrl }: CalendarWidgetProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-12
  const [data, setData] = useState<EventsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    setData(null);
    fetch(`${apiBaseUrl}/api/v1/modules/calendar/events/month?year=${viewYear}&month=${viewMonth}`)
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
  }, [apiBaseUrl, viewYear, viewMonth]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    (data?.events ?? []).forEach((event) => {
      const forDate = map.get(event.date) ?? [];
      forDate.push(event);
      map.set(event.date, forDate);
    });
    return map;
  }, [data]);

  const goToPreviousMonth = () => {
    if (viewMonth === 1) {
      setViewYear((year) => year - 1);
      setViewMonth(12);
    } else {
      setViewMonth((month) => month - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((year) => year + 1);
      setViewMonth(1);
    } else {
      setViewMonth((month) => month + 1);
    }
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
  };

  const todayIso = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
  const cells = monthCells(viewYear, viewMonth);

  return (
    <Card className="sm:col-span-2">
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            calendar_month
          </span>
        }
      >
        <CardTitle>
          {MONTH_NAMES[viewMonth - 1]} {viewYear}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={goToPreviousMonth} aria-label="Previous month">
            <span className="material-symbols-rounded" aria-hidden>
              chevron_left
            </span>
          </Button>
          <Button variant="ghost" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" onClick={goToNextMonth} aria-label="Next month">
            <span className="material-symbols-rounded" aria-hidden>
              chevron_right
            </span>
          </Button>
        </div>

        {error ? (
          <CardError message={error} onRetry={refresh} />
        ) : data === null ? (
          <CardLoading />
        ) : !data.configured ? (
          <CardEmpty icon="event_busy" message="Google Calendar isn't connected yet - see modules/calendar/README.md." />
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label, index) => (
              <div key={`${label}-${index}`} className="text-center text-caption text-text-secondary">
                {label}
              </div>
            ))}
            {cells.map((iso, index) => {
              if (!iso) return <div key={`empty-${index}`} />;
              const dayEvents = eventsByDate.get(iso) ?? [];
              const day = Number(iso.slice(-2));
              const visible = dayEvents.slice(0, 2);
              const hiddenCount = dayEvents.length - visible.length;
              return (
                <div
                  key={iso}
                  className={`flex min-h-16 flex-col gap-0.5 rounded-md p-1 ${
                    iso === todayIso ? "bg-accent-primary/15 ring-1 ring-accent-primary" : "bg-background-secondary"
                  }`}
                >
                  <span className="text-caption text-text-secondary">{day}</span>
                  {visible.map((event) => (
                    <span
                      key={`${event.time}-${event.title}`}
                      title={`${event.time} ${event.title}`}
                      className="truncate rounded bg-accent-primary/20 px-1 text-caption text-text-primary"
                    >
                      {event.title}
                    </span>
                  ))}
                  {hiddenCount > 0 ? (
                    <span className="text-caption text-text-secondary">+{hiddenCount} more</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
