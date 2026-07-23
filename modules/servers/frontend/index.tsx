import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardLoading } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface ServerStats {
  cpuPercent: number;
  ramUsedGb: number;
  ramTotalGb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  temperatureC: number;
}

export interface ServersWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  displayValue: string;
}

function StatBar({ label, value, max, displayValue }: StatBarProps) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-caption text-text-secondary">
        <span>{label}</span>
        <span>{displayValue}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-surface-hover">
        <div
          className="h-2 rounded-full bg-accent-primary transition-all duration-base ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** Simulated readings for now - see the module README for why. */
export default function ServersWidget({ eventBus, apiBaseUrl }: ServersWidgetProps) {
  const [stats, setStats] = useState<ServerStats | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/servers/stats`)
      .then((response) => response.json())
      .then((data: ServerStats) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEventBus(eventBus, "server.metrics", (payload) => setStats(payload as ServerStats));

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            dns
          </span>
        }
      >
        <CardTitle>Servers</CardTitle>
        <CardSubtitle>Simulated data</CardSubtitle>
      </CardHeader>
      {stats ? (
        <CardContent className="flex flex-col gap-3">
          <StatBar
            label="CPU"
            value={stats.cpuPercent}
            max={100}
            displayValue={`${Math.round(stats.cpuPercent)}%`}
          />
          <StatBar
            label="RAM"
            value={stats.ramUsedGb}
            max={stats.ramTotalGb}
            displayValue={`${stats.ramUsedGb.toFixed(1)} / ${stats.ramTotalGb.toFixed(0)} GB`}
          />
          <StatBar
            label="Disk"
            value={stats.diskUsedGb}
            max={stats.diskTotalGb}
            displayValue={`${stats.diskUsedGb.toFixed(0)} / ${stats.diskTotalGb.toFixed(0)} GB`}
          />
          <div className="flex items-center justify-between text-caption text-text-secondary">
            <span>Temperature</span>
            <span>{stats.temperatureC.toFixed(1)}&deg;C</span>
          </div>
        </CardContent>
      ) : (
        <CardLoading />
      )}
    </Card>
  );
}
