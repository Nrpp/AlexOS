import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";
import { formatFriendlyDate, formatTime } from "@alexos/utils";

export interface ClockWidgetProps {
  /** Injected by the host app's CoreProvider - keeps this widget portable across future clients. */
  eventBus?: EventBusLike | null;
}

/** The reference widget. Ticks from the Core Event Bus; falls back to a
 * local timer so it's never frozen or blank while the bus reconnects. */
export default function ClockWidget({ eventBus }: ClockWidgetProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEventBus(eventBus, "clock.tick", (payload) => {
    const { iso } = payload as { iso: string };
    setNow(new Date(iso));
  });

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            schedule
          </span>
        }
      >
        <CardTitle>{formatTime(now)}</CardTitle>
      </CardHeader>
      <CardContent>{formatFriendlyDate(now)}</CardContent>
    </Card>
  );
}
