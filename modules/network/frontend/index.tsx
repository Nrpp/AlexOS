import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardLoading } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface NetworkStats {
  devicesOnline: number;
  devicesTotal: number;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  publicIp: string;
  internalIp: string;
}

export interface NetworkWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

interface StatRowProps {
  label: string;
  value: string;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex items-center justify-between text-caption">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}

/** Simulated readings for now - see the module README for why. */
export default function NetworkWidget({ eventBus, apiBaseUrl }: NetworkWidgetProps) {
  const [stats, setStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/network/status`)
      .then((response) => response.json())
      .then((data: NetworkStats) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEventBus(eventBus, "network.updated", (payload) => setStats(payload as NetworkStats));

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            lan
          </span>
        }
      >
        <CardTitle>Network</CardTitle>
        <CardSubtitle>Simulated data</CardSubtitle>
      </CardHeader>
      {stats ? (
        <CardContent className="flex flex-col gap-2">
          <StatRow label="Devices online" value={`${stats.devicesOnline} / ${stats.devicesTotal}`} />
          <StatRow label="Download" value={`${stats.downloadMbps.toFixed(0)} Mbps`} />
          <StatRow label="Upload" value={`${stats.uploadMbps.toFixed(0)} Mbps`} />
          <StatRow label="Latency" value={`${stats.latencyMs.toFixed(0)} ms`} />
          <StatRow label="Public IP" value={stats.publicIp} />
          <StatRow label="Internal IP" value={stats.internalIp} />
        </CardContent>
      ) : (
        <CardLoading />
      )}
    </Card>
  );
}
