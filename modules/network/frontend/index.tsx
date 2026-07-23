import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, Button } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface SpeedTestResult {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
}

interface NetworkStatus {
  internalIp: string | null;
  publicIp: string | null;
  latencyMs: number | null;
  devicesOnline: number;
  lastSpeedTest: SpeedTestResult | null;
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

/** Real data: internal IP (local socket trick, works offline), public
 * IP (one outbound call to api.ipify.org, refreshed every ~5 min - see
 * modules/network/backend/__init__.py), and internet latency (one ICMP
 * ping per tick, Linux-only - see the module README). Bandwidth is
 * on-demand via "Run speed test" rather than continuously simulated. */
export default function NetworkWidget({ eventBus, apiBaseUrl }: NetworkWidgetProps) {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/network/status`)
      .then((response) => response.json())
      .then((data: NetworkStatus) => setStatus(data))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "network.updated", (payload) => setStatus(payload as NetworkStatus));

  const runSpeedTest = async () => {
    if (!apiBaseUrl) return;
    setTesting(true);
    setTestError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/network/speedtest`, { method: "POST" });
      if (!response.ok) throw new Error("speed test failed");
      const result: SpeedTestResult = await response.json();
      setStatus((current) => (current ? { ...current, lastSpeedTest: result } : current));
    } catch {
      setTestError("Couldn't run the speed test - check internet connectivity.");
    } finally {
      setTesting(false);
    }
  };

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
      </CardHeader>
      {status === null ? (
        <CardLoading />
      ) : (
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <StatRow label="Devices online" value={String(status.devicesOnline)} />
            <StatRow label="Latency" value={status.latencyMs !== null ? `${status.latencyMs.toFixed(0)} ms` : "Unavailable"} />
            <StatRow label="Public IP" value={status.publicIp ?? "Unavailable"} />
            <StatRow label="Internal IP" value={status.internalIp ?? "Unavailable"} />
          </div>

          <div className="border-t border-border pt-3">
            {status.lastSpeedTest ? (
              <div className="flex flex-col gap-2">
                <StatRow label="Download" value={`${status.lastSpeedTest.downloadMbps.toFixed(0)} Mbps`} />
                <StatRow label="Upload" value={`${status.lastSpeedTest.uploadMbps.toFixed(0)} Mbps`} />
                <StatRow label="Ping" value={`${status.lastSpeedTest.pingMs.toFixed(0)} ms`} />
              </div>
            ) : (
              <p className="text-caption text-text-secondary">No speed test run yet.</p>
            )}
            {testError ? <p className="mt-2 text-caption text-danger">{testError}</p> : null}
            <Button variant="secondary" className="mt-3 w-full" disabled={testing} onClick={() => void runSpeedTest()}>
              <span className="material-symbols-rounded text-lg" aria-hidden>
                speed
              </span>
              {testing ? "Running speed test..." : "Run speed test"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface Device {
  ip: string;
  mac: string;
  hostname: string | null;
}

export interface NetworkDevicesWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real LAN devices from the host's ARP table - Linux-only (see the
 * module README), so this shows an empty list rather than fake data on
 * other platforms. "Scan network" actively pings the local /24 first
 * to populate the ARP table before re-reading it - devices already
 * known (recent traffic) show up without scanning. */
export function NetworkDevicesWidget({ apiBaseUrl }: NetworkDevicesWidgetProps) {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [scanning, setScanning] = useState(false);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/network/devices`)
      .then((response) => response.json())
      .then((result: Device[]) => setDevices(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const scan = async () => {
    if (!apiBaseUrl) return;
    setScanning(true);
    try {
      await fetch(`${apiBaseUrl}/api/v1/modules/network/scan`, { method: "POST" });
      refresh();
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            devices
          </span>
        }
        actions={
          <Button variant="ghost" disabled={scanning} onClick={() => void scan()}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              sync
            </span>
            {scanning ? "Scanning..." : "Scan network"}
          </Button>
        }
      >
        <CardTitle>Devices</CardTitle>
      </CardHeader>

      {devices === null ? (
        <CardLoading />
      ) : devices.length === 0 ? (
        <CardEmpty icon="devices_off" message="No devices found yet - try Scan network." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {devices.map((device) => (
              <li key={device.ip} className="flex items-center justify-between gap-3 text-body">
                <span className="truncate text-text-primary">{device.hostname ?? device.ip}</span>
                <span className="shrink-0 text-caption text-text-secondary">{device.ip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
