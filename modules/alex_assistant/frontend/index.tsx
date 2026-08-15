import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardError } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";
import { formatFriendlyDate, formatTime } from "@alexos/utils";

interface Reminder {
  id: string;
  text: string;
  due_at: string;
}

interface RemindersResponse {
  configured: boolean;
  reminders: Reminder[];
}

interface ConnectionState {
  configured: boolean;
  connected: boolean;
}

interface StatusResponse {
  configured: boolean;
  reachable: boolean;
  ai_provider?: string;
  ai_reachable?: boolean;
  plugins?: string[];
  tools?: string[];
  voice_enabled?: boolean;
}

export interface AlexAssistantWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

/** due_at is a naive local ISO string (Proyect-ALEX's own timezone, not
 * UTC - see its reminders_plugin.py). Parsed as local time here too,
 * which is correct as long as both Pis share a timezone - true for a
 * single-user, single-location setup. */
function formatDueAt(dueAt: string): string {
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return dueAt;
  return `${formatFriendlyDate(date)}, ${formatTime(date)}`;
}

function ConnectionDot({ label, ok }: { label: string; ok: boolean | null }) {
  const dotClass = ok === null ? "bg-text-secondary" : ok ? "bg-success" : "bg-danger";
  return (
    <div className="flex items-center gap-2 text-caption text-text-secondary" title={label}>
      <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

/** Live link to Alex, the personal assistant running on its own
 * Raspberry Pi - see modules/alex_assistant/README.md to connect yours.
 * This widget shows connection state and the pending reminders list;
 * see the named AlexAssistantStatusWidget export for AI/plugin health. */
export default function AlexAssistantWidget({ eventBus, apiBaseUrl }: AlexAssistantWidgetProps) {
  const [data, setData] = useState<RemindersResponse | null>(null);
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/alex_assistant/reminders`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail || `Request failed (${response.status})`);
        }
        setError(null);
        return response.json();
      })
      .then((result: RemindersResponse) => setData(result))
      .catch((err: Error) => setError(err.message));
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "alex_assistant.connection", (payload) => setConnection(payload as ConnectionState));
  useEventBus(eventBus, "alex_assistant.reminders_changed", refresh);
  useEventBus(eventBus, "alex_assistant.notification", refresh);

  const cancelReminder = async (reminder: Reminder) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/alex_assistant/reminders/${reminder.id}`, { method: "DELETE" });
    refresh();
  };

  const connectionLabel = !connection
    ? "Checking..."
    : !connection.configured
      ? "Not configured"
      : connection.connected
        ? "Connected"
        : "Offline";
  const connectionOk = !connection || !connection.configured ? null : connection.connected;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            smart_toy
          </span>
        }
        actions={<ConnectionDot label={connectionLabel} ok={connectionOk} />}
      >
        <CardTitle>Alex</CardTitle>
      </CardHeader>

      {error ? (
        <CardError message={error} onRetry={refresh} />
      ) : data === null ? (
        <CardLoading />
      ) : !data.configured ? (
        <CardEmpty icon="smart_toy" message="Alex isn't connected yet - see modules/alex_assistant/README.md." />
      ) : data.reminders.length === 0 ? (
        <CardEmpty icon="notifications" message="No pending reminders." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {data.reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-body text-text-primary">{reminder.text}</p>
                  <p className="text-caption text-text-secondary">{formatDueAt(reminder.due_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void cancelReminder(reminder)}
                  aria-label="Cancel reminder"
                  className="shrink-0 text-text-secondary hover:text-danger"
                >
                  <span className="material-symbols-rounded text-lg" aria-hidden>
                    close
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

function StatusRow({ label, ok, value }: { label: string; ok?: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-body text-text-secondary">{label}</span>
      {value !== undefined ? (
        <span className="text-body text-text-primary">{value}</span>
      ) : (
        <span className={`h-2 w-2 rounded-full ${ok ? "bg-success" : "bg-danger"}`} aria-hidden />
      )}
    </div>
  );
}

/** AI provider, tools, plugins and reachability - the operational health
 * half of the alex_assistant module, split from the main widget so a
 * page can show connection+reminders without the extra detail, or vice
 * versa (same pattern as modules/servers's two widgets). */
export function AlexAssistantStatusWidget({ eventBus, apiBaseUrl }: AlexAssistantWidgetProps) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/alex_assistant/status`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail || `Request failed (${response.status})`);
        }
        setError(null);
        return response.json();
      })
      .then((result: StatusResponse) => setData(result))
      .catch((err: Error) => setError(err.message));
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "alex_assistant.status", (payload) => setData(payload as StatusResponse));

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            monitor_heart
          </span>
        }
      >
        <CardTitle>Alex Status</CardTitle>
      </CardHeader>

      {error ? (
        <CardError message={error} onRetry={refresh} />
      ) : data === null ? (
        <CardLoading />
      ) : !data.configured ? (
        <CardEmpty icon="monitor_heart" message="Alex isn't connected yet - see modules/alex_assistant/README.md." />
      ) : !data.reachable ? (
        <CardEmpty icon="cloud_off" message="Alex isn't responding right now." />
      ) : (
        <CardContent>
          <div className="flex flex-col gap-3">
            <StatusRow label="AI provider" value={data.ai_provider ?? "unknown"} />
            <StatusRow label="AI reachable" ok={data.ai_reachable ?? false} />
            <StatusRow label="Voice" value={data.voice_enabled ? "Enabled" : "Disabled"} />
            <StatusRow label="Plugins loaded" value={String(data.plugins?.length ?? 0)} />
            <StatusRow label="Tools available" value={String(data.tools?.length ?? 0)} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
