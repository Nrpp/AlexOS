import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardLoading, Button } from "@alexos/ui";

interface WaterStatus {
  date: string;
  count: number;
  dailyGoal: number;
}

export interface WaterTrackerWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real, persisted daily water count - resets automatically each day
 * based on the real calendar date (see modules/water_tracker/backend). */
export default function WaterTrackerWidget({ apiBaseUrl }: WaterTrackerWidgetProps) {
  const [status, setStatus] = useState<WaterStatus | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/water_tracker/today`)
      .then((response) => response.json())
      .then((result: WaterStatus) => setStatus(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logGlass = async () => {
    if (!apiBaseUrl) return;
    const response = await fetch(`${apiBaseUrl}/api/v1/modules/water_tracker/log`, { method: "POST" });
    const result: WaterStatus = await response.json();
    setStatus(result);
  };

  const reset = async () => {
    if (!apiBaseUrl) return;
    const response = await fetch(`${apiBaseUrl}/api/v1/modules/water_tracker/reset`, { method: "POST" });
    const result: WaterStatus = await response.json();
    setStatus(result);
  };

  const percent = status ? Math.min(100, Math.round((status.count / status.dailyGoal) * 100)) : 0;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            water_drop
          </span>
        }
      >
        <CardTitle>Water tracker</CardTitle>
      </CardHeader>
      {status === null ? (
        <CardLoading />
      ) : (
        <CardContent className="flex flex-col items-center gap-3">
          <span className="text-display font-semibold tabular-nums text-text-primary">
            {status.count} / {status.dailyGoal}
          </span>
          <div className="h-2 w-full rounded-full bg-surface-hover">
            <div
              className="h-2 rounded-full bg-accent-primary transition-all duration-base ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => void logGlass()}>
              <span className="material-symbols-rounded text-lg" aria-hidden>
                add
              </span>
              Log a glass
            </Button>
            <Button variant="ghost" onClick={() => void reset()}>
              Reset
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
