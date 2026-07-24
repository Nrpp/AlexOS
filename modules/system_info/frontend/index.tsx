import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardLoading } from "@alexos/ui";

interface SystemHealth {
  status: "ok" | "degraded";
  version: string;
  uptimeSeconds: number;
  modulesLoaded: number;
}

export interface SystemInfoWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** No module-specific backend - reads the Core's own
 * GET /api/v1/system/health, which already exists for every AlexOS
 * install. Real uptime/version/module-count, not simulated. */
export default function SystemInfoWidget({ apiBaseUrl }: SystemInfoWidgetProps) {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/system/health`)
      .then((response) => response.json())
      .then((result: SystemHealth) => {
        if (!cancelled) setHealth(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            info
          </span>
        }
      >
        <CardTitle>System info</CardTitle>
      </CardHeader>
      {health === null ? (
        <CardLoading />
      ) : (
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-caption">
            <span className="text-text-secondary">Status</span>
            <span className={health.status === "ok" ? "text-success" : "text-warning"}>{health.status}</span>
          </div>
          <div className="flex items-center justify-between text-caption">
            <span className="text-text-secondary">Version</span>
            <span className="text-text-primary">{health.version}</span>
          </div>
          <div className="flex items-center justify-between text-caption">
            <span className="text-text-secondary">Uptime</span>
            <span className="text-text-primary">{formatUptime(health.uptimeSeconds)}</span>
          </div>
          <div className="flex items-center justify-between text-caption">
            <span className="text-text-secondary">Modules loaded</span>
            <span className="text-text-primary">{health.modulesLoaded}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
