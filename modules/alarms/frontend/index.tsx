import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button, Toggle } from "@alexos/ui";

interface Alarm {
  id: string;
  label: string;
  time: string; // "HH:MM"
  enabled: boolean;
}

export interface AlarmsWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

export default function AlarmsWidget({ apiBaseUrl }: AlarmsWidgetProps) {
  const [alarms, setAlarms] = useState<Alarm[] | null>(null);
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("08:00");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/alarms/alarms`)
      .then((response) => response.json())
      .then((result: Alarm[]) => setAlarms(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addAlarm = async () => {
    const trimmed = label.trim();
    if (!trimmed || !time || !apiBaseUrl) return;
    setLabel("");
    await fetch(`${apiBaseUrl}/api/v1/modules/alarms/alarms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: trimmed, time }),
    });
    refresh();
  };

  const toggleAlarm = async (alarm: Alarm) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/alarms/alarms/${alarm.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !alarm.enabled }),
    });
    refresh();
  };

  const removeAlarm = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/alarms/alarms/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            alarm
          </span>
        }
      >
        <CardTitle>Alarms</CardTitle>
      </CardHeader>

      {alarms === null ? (
        <CardLoading />
      ) : alarms.length === 0 ? (
        <CardEmpty icon="alarm" message="No alarms set." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {alarms.map((alarm) => (
              <li key={alarm.id} className="flex items-center justify-between gap-3">
                <div className={alarm.enabled ? "" : "opacity-50"}>
                  <p className="text-title font-semibold text-text-primary">{alarm.time}</p>
                  <p className="text-caption text-text-secondary">{alarm.label}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Toggle checked={alarm.enabled} onCheckedChange={() => void toggleAlarm(alarm)} label={`Toggle ${alarm.label}`} />
                  <button
                    type="button"
                    onClick={() => void removeAlarm(alarm.id)}
                    aria-label={`Remove ${alarm.label}`}
                    className="text-text-secondary hover:text-danger"
                  >
                    <span className="material-symbols-rounded text-lg" aria-hidden>
                      close
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <CardFooter className="gap-2">
        <Input
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          aria-label="Alarm time"
          className="w-28"
        />
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void addAlarm()}
          placeholder="Label..."
          aria-label="Alarm label"
          className="flex-1"
        />
        <Button variant="secondary" onClick={() => void addAlarm()}>
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
