import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardContent,
  CardFooter,
  CardEmpty,
  CardLoading,
  Input,
  Button,
} from "@alexos/ui";
import { useEventBus, usePolling, type EventBusLike } from "@alexos/hooks";

export interface PresenceWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

interface PresenceDevice {
  id: string;
  name: string;
  event: "arrive" | "leave" | null;
  lastSeen: string | null;
  createdAt?: string;
}

interface PresenceStatus {
  locked: boolean;
  home: boolean;
  primaryDeviceId: string | null;
  pinConfigured: boolean;
  devices: PresenceDevice[];
}

const STATUS_POLL_MS = 15_000;

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body && (body as { detail?: string }).detail) || `Request to ${url} failed`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/**
 * Home/away status from each phone's own OS-level arrive/leave
 * automation - see modules/presence/README.md for the iOS Shortcuts /
 * Android Tasker setup that feeds this. The gate that actually locks
 * the dashboard while away lives at the app-shell level
 * (apps/web/src/layout/PresenceGate.tsx), not here - this is just the
 * glanceable status card for when you're already looking at Home.
 */
export default function PresenceWidget({ eventBus, apiBaseUrl }: PresenceWidgetProps) {
  const [status, setStatus] = useState<PresenceStatus | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/presence/status`)
      .then((response) => response.json())
      .then((result: PresenceStatus) => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEventBus(eventBus, "presence.updated", (payload) => setStatus(payload as PresenceStatus));

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            {status?.home ? "home" : "location_on"}
          </span>
        }
      >
        <CardTitle>Presence</CardTitle>
        {status ? <CardSubtitle>{status.home ? "Home" : "Away"}</CardSubtitle> : null}
      </CardHeader>
      {status === null ? (
        <CardLoading />
      ) : status.devices.length === 0 ? (
        <CardEmpty icon="smartphone" message="No devices registered yet - add one in Settings." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {status.devices.map((device) => (
              <li key={device.id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      device.event === "arrive" ? "bg-success" : "bg-text-secondary"
                    }`}
                    aria-hidden
                  />
                  <span className="truncate text-body text-text-primary">
                    {device.name}
                    {device.id === status.primaryDeviceId ? " (primary)" : ""}
                  </span>
                </div>
                <span className="shrink-0 text-caption text-text-secondary">
                  {formatRelativeTime(device.lastSeen)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

// --- Settings: manage devices, primary device, and the away-mode PIN ------

interface RevealedToken {
  deviceId: string;
  token: string;
}

function DeviceRow({
  device,
  isPrimary,
  apiBaseUrl,
  revealed,
  onReveal,
  onRename,
  onDelete,
  onSetPrimary,
  busy,
}: {
  device: PresenceDevice;
  isPrimary: boolean;
  apiBaseUrl: string;
  revealed: string | null;
  onReveal: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onSetPrimary: () => void;
  busy: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(device.name);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const webhookUrl = (event: "arrive" | "leave") =>
    `${apiBaseUrl}/api/v1/modules/presence/webhook?device_id=${encodeURIComponent(device.id)}&event=${event}&token=${revealed ?? ""}`;

  const copy = (value: string, label: string) => {
    navigator.clipboard
      ?.writeText(value)
      .then(() => setCopyMessage(`${label} copied.`))
      .catch(() => setCopyMessage(null));
    setTimeout(() => setCopyMessage(null), 2000);
  };

  return (
    <li className="flex flex-col gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              device.event === "arrive" ? "bg-success" : "bg-text-secondary"
            }`}
            aria-hidden
          />
          {renaming ? (
            <Input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              aria-label={`Rename ${device.name}`}
              className="h-10"
            />
          ) : (
            <span className="truncate text-body text-text-primary">
              {device.name}
              {isPrimary ? " (primary)" : ""}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {renaming ? (
            <>
              <Button
                variant="ghost"
                disabled={busy || !nameDraft.trim()}
                onClick={() => {
                  onRename(nameDraft.trim());
                  setRenaming(false);
                }}
              >
                Save
              </Button>
              <Button variant="ghost" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              {!isPrimary ? (
                <Button variant="ghost" disabled={busy} onClick={onSetPrimary}>
                  Set primary
                </Button>
              ) : null}
              <Button variant="ghost" disabled={busy} onClick={() => setRenaming(true)} aria-label={`Rename ${device.name}`}>
                <span className="material-symbols-rounded text-lg" aria-hidden>
                  edit
                </span>
              </Button>
              <Button variant="ghost" disabled={busy} onClick={onDelete} aria-label={`Remove ${device.name}`}>
                <span className="material-symbols-rounded text-lg" aria-hidden>
                  delete
                </span>
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="text-caption text-text-secondary">
        {device.event ? `Last ${device.event} ${formatRelativeTime(device.lastSeen)}` : "Never reported yet"}
      </p>

      {revealed === null ? (
        <Button variant="secondary" disabled={busy} onClick={onReveal} className="self-start">
          <span className="material-symbols-rounded text-lg" aria-hidden>
            visibility
          </span>
          Reveal webhook URLs
        </Button>
      ) : (
        <div className="flex flex-col gap-2 rounded-button bg-background-secondary p-3">
          <p className="text-caption text-text-secondary">
            Secret - anyone with these URLs can report this device's location. Set one automation per URL.
          </p>
          {(["arrive", "leave"] as const).map((event) => (
            <div key={event} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-caption text-text-secondary">{event === "arrive" ? "Arrive" : "Leave"}</span>
              <Input readOnly value={webhookUrl(event)} className="h-10 flex-1 font-mono text-caption" aria-label={`${event} webhook URL for ${device.name}`} />
              <Button variant="ghost" onClick={() => copy(webhookUrl(event), `${event} URL`)} aria-label={`Copy ${event} URL`}>
                <span className="material-symbols-rounded text-lg" aria-hidden>
                  content_copy
                </span>
              </Button>
            </div>
          ))}
          {copyMessage ? <p className="text-caption text-success">{copyMessage}</p> : null}
        </div>
      )}
    </li>
  );
}

/** The Settings-page management view: add/rename/remove devices, choose
 * the primary device, reveal a device's webhook URLs, and set/change
 * the away-mode PIN. See apps/web/src/pages/Settings/index.tsx for how
 * this is wired in. */
export function PresenceSettings({ apiBaseUrl }: PresenceWidgetProps) {
  const fetchStatus = useCallback(async () => {
    if (!apiBaseUrl) throw new Error("no apiBaseUrl");
    return fetchJson<PresenceStatus>(`${apiBaseUrl}/api/v1/modules/presence/status`);
  }, [apiBaseUrl]);
  const { data: status, refetch } = usePolling(fetchStatus, STATUS_POLL_MS, { enabled: Boolean(apiBaseUrl) });

  const [newDeviceName, setNewDeviceName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedTokens, setRevealedTokens] = useState<RevealedToken[]>([]);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);

  const revealedFor = (deviceId: string) => revealedTokens.find((entry) => entry.deviceId === deviceId)?.token ?? null;

  const runAction = async (action: () => Promise<unknown>) => {
    if (!apiBaseUrl) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      await refetch();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const addDevice = () => {
    const name = newDeviceName.trim();
    if (!name || !apiBaseUrl) return;
    void runAction(async () => {
      const device = await fetchJson<{ id: string; name: string; token: string }>(
        `${apiBaseUrl}/api/v1/modules/presence/devices`,
        { method: "POST", body: JSON.stringify({ name }) },
      );
      setRevealedTokens((current) => [...current, { deviceId: device.id, token: device.token }]);
      setNewDeviceName("");
    });
  };

  const reveal = (deviceId: string) => {
    if (!apiBaseUrl) return;
    fetchJson<{ id: string; token: string }>(`${apiBaseUrl}/api/v1/modules/presence/devices/${deviceId}/token`)
      .then((result) => setRevealedTokens((current) => [...current.filter((e) => e.deviceId !== deviceId), { deviceId, token: result.token }]))
      .catch(() => undefined);
  };

  const rename = (deviceId: string, name: string) =>
    runAction(() =>
      fetchJson(`${apiBaseUrl}/api/v1/modules/presence/devices/${deviceId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    );

  const remove = (deviceId: string) =>
    runAction(() => fetchJson(`${apiBaseUrl}/api/v1/modules/presence/devices/${deviceId}`, { method: "DELETE" }));

  const setPrimary = (deviceId: string) =>
    runAction(() => fetchJson(`${apiBaseUrl}/api/v1/modules/presence/devices/${deviceId}/primary`, { method: "POST" }));

  const lockNow = () => runAction(() => fetchJson(`${apiBaseUrl}/api/v1/modules/presence/lock`, { method: "POST" }));

  const submitPin = async () => {
    if (!apiBaseUrl) return;
    setPinError(null);
    setPinSuccess(null);
    if (newPin !== confirmPin) {
      setPinError("PINs don't match.");
      return;
    }
    if (!/^\d{4,8}$/.test(newPin)) {
      setPinError("PIN must be 4-8 digits.");
      return;
    }
    setPinBusy(true);
    try {
      await fetchJson(`${apiBaseUrl}/api/v1/modules/presence/pin`, {
        method: "POST",
        body: JSON.stringify({
          newPin,
          ...(status?.pinConfigured ? { currentPin } : {}),
        }),
      });
      setPinSuccess(status?.pinConfigured ? "PIN changed." : "PIN set.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      await refetch();
    } catch (pinRequestError) {
      setPinError(pinRequestError instanceof Error ? pinRequestError.message : "Couldn't update the PIN.");
    } finally {
      setPinBusy(false);
    }
  };

  if (!apiBaseUrl) {
    return (
      <Card>
        <CardEmpty icon="location_on" message="Presence isn't available." />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader icon={<span className="material-symbols-rounded" aria-hidden>location_on</span>}>
        <CardTitle>Presence &amp; away mode</CardTitle>
        <CardSubtitle>
          {status ? (status.home ? "Home right now" : status.locked ? "Away - dashboard locked" : "Away - unlocked") : "Loading..."}
        </CardSubtitle>
      </CardHeader>

      {status === null ? (
        <CardLoading />
      ) : (
        <>
          <CardContent className="flex flex-col gap-4">
            {status.devices.length === 0 ? (
              <CardEmpty icon="smartphone" message="No devices yet. Add one below, then set up its automation." />
            ) : (
              <ul className="flex flex-col gap-4">
                {status.devices.map((device) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    isPrimary={device.id === status.primaryDeviceId}
                    apiBaseUrl={apiBaseUrl}
                    revealed={revealedFor(device.id)}
                    onReveal={() => reveal(device.id)}
                    onRename={(name) => void rename(device.id, name)}
                    onDelete={() => void remove(device.id)}
                    onSetPrimary={() => void setPrimary(device.id)}
                    busy={busy}
                  />
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2">
              <Input
                value={newDeviceName}
                onChange={(event) => setNewDeviceName(event.target.value)}
                placeholder="Device name, e.g. Lucas's iPhone"
                aria-label="New device name"
                className="flex-1"
                onKeyDown={(event) => event.key === "Enter" && addDevice()}
              />
              <Button variant="primary" disabled={busy || !newDeviceName.trim()} onClick={addDevice}>
                Add device
              </Button>
            </div>
            {error ? <p className="text-caption text-danger">{error}</p> : null}

            {!status.locked ? (
              <Button variant="secondary" onClick={lockNow} disabled={busy} className="self-start">
                <span className="material-symbols-rounded text-lg" aria-hidden>
                  lock
                </span>
                Lock now
              </Button>
            ) : null}
          </CardContent>

          <CardFooter className="flex-col items-stretch gap-3 pt-4">
            <div>
              <p className="text-body font-semibold text-text-primary">Away-mode PIN</p>
              <p className="text-caption text-text-secondary">
                {status.pinConfigured ? "Required to unlock the dashboard while away." : "Not set yet - away mode can't be unlocked until you set one."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {status.pinConfigured ? (
                <Input
                  type="password"
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(event) => setCurrentPin(event.target.value)}
                  placeholder="Current PIN"
                  aria-label="Current PIN"
                  className="sm:w-40"
                />
              ) : null}
              <Input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(event) => setNewPin(event.target.value)}
                placeholder="New PIN"
                aria-label="New PIN"
                className="sm:w-40"
              />
              <Input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value)}
                placeholder="Confirm new PIN"
                aria-label="Confirm new PIN"
                className="sm:w-40"
              />
              <Button variant="primary" disabled={pinBusy || !newPin} onClick={() => void submitPin()}>
                {status.pinConfigured ? "Change PIN" : "Set PIN"}
              </Button>
            </div>
            {pinError ? <p className="text-caption text-danger">{pinError}</p> : null}
            {pinSuccess ? <p className="text-caption text-success">{pinSuccess}</p> : null}
          </CardFooter>
        </>
      )}
    </Card>
  );
}
