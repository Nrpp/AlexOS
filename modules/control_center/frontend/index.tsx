import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardContent,
  CardEmpty,
  CardLoading,
  CardFooter,
  Input,
  Button,
  Toggle,
} from "@alexos/ui";

export interface ControlCenterWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

interface WifiNetwork {
  ssid: string;
  signal: number;
  secure: boolean;
  inUse: boolean;
}

interface WifiResponse {
  available: boolean;
  networks: WifiNetwork[];
}

function signalIcon(signal: number): string {
  if (signal >= 75) return "wifi";
  if (signal >= 40) return "wifi_2_bar";
  return "wifi_1_bar";
}

/** Real WiFi control via the host's NetworkManager (`nmcli`) - see the
 * module README for the D-Bus/host-privilege tradeoff this requires,
 * and why it can't be tested on this project's Windows dev machine. */
export default function WifiWidget({ apiBaseUrl }: ControlCenterWidgetProps) {
  const [data, setData] = useState<WifiResponse | null>(null);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/control_center/wifi/networks`)
      .then((response) => response.json())
      .then((result: WifiResponse) => setData(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startConnect = (network: WifiNetwork) => {
    if (network.secure) {
      setConnectingTo(network.ssid);
      setPassword("");
    } else {
      void connect(network.ssid, undefined);
    }
  };

  const connect = async (ssid: string, networkPassword: string | undefined) => {
    if (!apiBaseUrl) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/control_center/wifi/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid, password: networkPassword }),
      });
      const result: { ok: boolean; message: string } = await response.json();
      setMessage(result.message);
      if (result.ok) setConnectingTo(null);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!apiBaseUrl) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/control_center/wifi/disconnect`, {
        method: "POST",
      });
      const result: { ok: boolean; message: string } = await response.json();
      setMessage(result.message);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            wifi
          </span>
        }
        actions={
          <Button variant="ghost" disabled={busy} onClick={refresh}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              sync
            </span>
          </Button>
        }
      >
        <CardTitle>WiFi</CardTitle>
      </CardHeader>

      {data === null ? (
        <CardLoading />
      ) : !data.available ? (
        <CardEmpty icon="wifi_off" message="WiFi control isn't available - see modules/control_center/README.md." />
      ) : data.networks.length === 0 ? (
        <CardEmpty icon="wifi_off" message="No networks found - try refreshing." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {data.networks.map((network) => (
              <li key={network.ssid} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="material-symbols-rounded text-lg text-text-secondary" aria-hidden>
                      {signalIcon(network.signal)}
                    </span>
                    <span className="truncate text-body text-text-primary">{network.ssid}</span>
                    {network.secure ? (
                      <span className="material-symbols-rounded text-sm text-text-secondary" aria-hidden>
                        lock
                      </span>
                    ) : null}
                  </div>
                  {network.inUse ? (
                    <Button variant="ghost" disabled={busy} onClick={() => void disconnect()}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button variant="ghost" disabled={busy} onClick={() => startConnect(network)}>
                      Connect
                    </Button>
                  )}
                </div>
                {connectingTo === network.ssid ? (
                  <div className="flex gap-2 pl-8">
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      aria-label={`Password for ${network.ssid}`}
                      className="flex-1"
                    />
                    <Button variant="secondary" disabled={busy} onClick={() => void connect(network.ssid, password)}>
                      Join
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      {message ? (
        <CardFooter className="justify-start">
          <p className="text-caption text-text-secondary">{message}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}

interface BluetoothDevice {
  address: string;
  name: string;
  paired: boolean;
  connected: boolean;
}

interface BluetoothResponse {
  available: boolean;
  devices: BluetoothDevice[];
}

/** Real Bluetooth control via the host's BlueZ (`bluetoothctl`) - same
 * tradeoff and platform limitation as WifiWidget above. */
export function BluetoothWidget({ apiBaseUrl }: ControlCenterWidgetProps) {
  const [data, setData] = useState<BluetoothResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busyAddress, setBusyAddress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/control_center/bluetooth/devices`)
      .then((response) => response.json())
      .then((result: BluetoothResponse) => setData(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const scan = async () => {
    if (!apiBaseUrl) return;
    setScanning(true);
    try {
      await fetch(`${apiBaseUrl}/api/v1/modules/control_center/bluetooth/scan`, { method: "POST" });
      refresh();
    } finally {
      setScanning(false);
    }
  };

  const pair = async (device: BluetoothDevice) => {
    if (!apiBaseUrl) return;
    setBusyAddress(device.address);
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/control_center/bluetooth/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: device.address }),
      });
      const result: { ok: boolean; message: string } = await response.json();
      setMessage(result.message);
      refresh();
    } finally {
      setBusyAddress(null);
    }
  };

  const remove = async (device: BluetoothDevice) => {
    if (!apiBaseUrl) return;
    setBusyAddress(device.address);
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/control_center/bluetooth/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: device.address }),
      });
      const result: { ok: boolean; message: string } = await response.json();
      setMessage(result.message);
      refresh();
    } finally {
      setBusyAddress(null);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            bluetooth
          </span>
        }
        actions={
          <Button variant="ghost" disabled={scanning} onClick={() => void scan()}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              bluetooth_searching
            </span>
            {scanning ? "Scanning..." : "Scan"}
          </Button>
        }
      >
        <CardTitle>Bluetooth</CardTitle>
        <CardSubtitle>Scanning takes a few seconds.</CardSubtitle>
      </CardHeader>

      {data === null ? (
        <CardLoading />
      ) : !data.available ? (
        <CardEmpty
          icon="bluetooth_disabled"
          message="Bluetooth control isn't available - see modules/control_center/README.md."
        />
      ) : data.devices.length === 0 ? (
        <CardEmpty icon="bluetooth_disabled" message="No devices found - try Scan." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {data.devices.map((device) => (
              <li key={device.address} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-body text-text-primary">{device.name}</p>
                  <p className="text-caption text-text-secondary">
                    {device.connected ? "Connected" : device.paired ? "Paired" : "Not paired"}
                  </p>
                </div>
                {device.paired ? (
                  <Button
                    variant="ghost"
                    disabled={busyAddress === device.address}
                    onClick={() => void remove(device)}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    disabled={busyAddress === device.address}
                    onClick={() => void pair(device)}
                  >
                    Pair
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      {message ? (
        <CardFooter className="justify-start">
          <p className="text-caption text-text-secondary">{message}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}

interface BluetoothSpeakerDevice {
  address: string;
  name: string;
  paired: boolean;
  connected: boolean;
  audioCapable: boolean;
}

interface BluetoothSpeakerStatus {
  available: boolean;
  powered: boolean;
  discoverable: boolean;
  pairable: boolean;
  devices: BluetoothSpeakerDevice[];
}

/** Makes the Pi discoverable/pairable so a phone can pair with it as a
 * Bluetooth speaker source, and shows which paired device (if any) is
 * both connected AND advertises the A2DP Audio Sink profile - the
 * closest this widget can tell you to "yes, that phone is streaming
 * music to you right now" without diving into BlueZ's MediaTransport1
 * D-Bus interface for exact playback state.
 *
 * Turning this on does NOT by itself make audio come out of anything -
 * that needs a one-time PipeWire/WirePlumber setup on the Pi's host OS,
 * outside anything this containerized widget can configure. See
 * modules/control_center/README.md's "Bluetooth speaker" section for
 * that setup - this widget is the "let a phone find and pair" half. */
export function BluetoothSpeakerWidget({ apiBaseUrl }: ControlCenterWidgetProps) {
  const [status, setStatus] = useState<BluetoothSpeakerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/control_center/bluetooth/speaker/status`)
      .then((response) => response.json())
      .then((result: BluetoothSpeakerStatus) => setStatus(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSpeakerMode = async (enabled: boolean) => {
    if (!apiBaseUrl) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/control_center/bluetooth/speaker/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const result: { ok: boolean; message: string } = await response.json();
      if (!result.ok) setMessage(result.message);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const activeSource = status?.devices.find((device) => device.connected && device.audioCapable) ?? null;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            speaker
          </span>
        }
      >
        <CardTitle>Bluetooth speaker</CardTitle>
        <CardSubtitle>Let a phone find and pair with this Pi to stream music to it.</CardSubtitle>
      </CardHeader>

      {status === null ? (
        <CardLoading />
      ) : !status.available ? (
        <CardEmpty
          icon="bluetooth_disabled"
          message="Bluetooth control isn't available - see modules/control_center/README.md."
        />
      ) : (
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span>Discoverable as a speaker</span>
              <p className="text-caption text-text-secondary">
                {status.discoverable && status.pairable
                  ? "Any nearby phone can find and pair now."
                  : "Off - existing paired devices can still reconnect on their own."}
              </p>
            </div>
            <Toggle
              checked={status.discoverable && status.pairable}
              onCheckedChange={(checked) => void setSpeakerMode(checked)}
              disabled={busy}
              label="Toggle Bluetooth speaker discoverability"
            />
          </div>

          {activeSource ? (
            <p className="flex items-center gap-2 text-caption text-success">
              <span className="material-symbols-rounded text-lg" aria-hidden>
                graphic_eq
              </span>
              {activeSource.name} is connected as an audio source.
            </p>
          ) : (
            <p className="text-caption text-text-secondary">No phone is currently connected as an audio source.</p>
          )}

          <p className="text-caption text-text-secondary">
            First time setting this up? The Pi also needs a one-time OS-level audio setup before sound actually
            comes out of anything - see modules/control_center/README.md.
          </p>
        </CardContent>
      )}

      {message ? (
        <CardFooter className="justify-start">
          <p className="text-caption text-text-secondary">{message}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
