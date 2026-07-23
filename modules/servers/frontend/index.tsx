import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardEmpty, CardLoading, Button } from "@alexos/ui";
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

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
}

interface ContainersResponse {
  available: boolean;
  containers: DockerContainer[];
}

export interface DockerContainersWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

const STATE_DOT_CLASS: Record<string, string> = {
  running: "bg-success",
  exited: "bg-text-secondary",
  paused: "bg-warning",
};

/** Real Docker containers via the host's Docker socket - see the module
 * README for the security tradeoff that requires and why this can't be
 * tested outside a Linux Docker host. */
export function DockerContainersWidget({ apiBaseUrl }: DockerContainersWidgetProps) {
  const [data, setData] = useState<ContainersResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/servers/containers`)
      .then((response) => response.json())
      .then((result: ContainersResponse) => setData(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runAction = async (container: DockerContainer, action: "start" | "stop" | "restart") => {
    if (!apiBaseUrl) return;
    setPendingAction(container.id);
    try {
      await fetch(`${apiBaseUrl}/api/v1/modules/servers/containers/${container.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      refresh();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            deployed_code
          </span>
        }
      >
        <CardTitle>Docker containers</CardTitle>
      </CardHeader>

      {data === null ? (
        <CardLoading />
      ) : !data.available ? (
        <CardEmpty
          icon="dns"
          message="Docker socket isn't mounted yet - see modules/servers/README.md."
        />
      ) : data.containers.length === 0 ? (
        <CardEmpty icon="deployed_code" message="No containers found." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-3">
            {data.containers.map((container) => (
              <li key={container.id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${STATE_DOT_CLASS[container.state] ?? "bg-text-secondary"}`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate text-body text-text-primary">{container.name}</p>
                    <p className="truncate text-caption text-text-secondary">{container.status}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {container.state === "running" ? (
                    <>
                      <Button
                        variant="icon"
                        disabled={pendingAction === container.id}
                        onClick={() => void runAction(container, "restart")}
                        aria-label={`Restart ${container.name}`}
                      >
                        <span className="material-symbols-rounded text-lg" aria-hidden>
                          restart_alt
                        </span>
                      </Button>
                      <Button
                        variant="icon"
                        disabled={pendingAction === container.id}
                        onClick={() => void runAction(container, "stop")}
                        aria-label={`Stop ${container.name}`}
                      >
                        <span className="material-symbols-rounded text-lg" aria-hidden>
                          stop_circle
                        </span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="icon"
                      disabled={pendingAction === container.id}
                      onClick={() => void runAction(container, "start")}
                      aria-label={`Start ${container.name}`}
                    >
                      <span className="material-symbols-rounded text-lg" aria-hidden>
                        play_circle
                      </span>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
