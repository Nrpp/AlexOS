import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, Button } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface FocusStatus {
  active: boolean;
  endsAt: string | null;
}

export interface FocusModeWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

const DURATION_OPTIONS_MINUTES = [25, 60, 90, 120];

function formatEndsAt(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Starting/stopping here publishes `focus.started`/`focus.ended` on the
 * Event Bus and fires outbound webhooks (see modules/focus/README.md) so
 * other devices can enter Do Not Disturb - AlexOS itself has no way to
 * remotely flip that switch on iPad/Android/Windows, so this is the
 * trigger, not the enforcement. */
export default function FocusModeWidget({ eventBus, apiBaseUrl }: FocusModeWidgetProps) {
  const [status, setStatus] = useState<FocusStatus | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(60);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/focus/status`)
      .then((response) => response.json())
      .then((result: FocusStatus) => setStatus(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "focus.started", refresh);
  useEventBus(eventBus, "focus.ended", refresh);

  const start = async () => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/focus/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMinutes }),
    });
    refresh();
  };

  const stop = async () => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/focus/stop`, { method: "POST" });
    refresh();
  };

  const active = status?.active ?? false;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            do_not_disturb_on
          </span>
        }
      >
        <CardTitle>Focus mode</CardTitle>
        <CardSubtitle>
          {active && status?.endsAt ? `Active until ${formatEndsAt(status.endsAt)}` : "Not active"}
        </CardSubtitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {active ? (
          <Button variant="primary" onClick={() => void stop()}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              stop_circle
            </span>
            End focus mode
          </Button>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS_MINUTES.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDurationMinutes(minutes)}
                  className={`rounded-button border px-3 py-2 text-caption transition-colors duration-base ease-out ${
                    durationMinutes === minutes
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-border text-text-secondary hover:border-accent-primary"
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <Button variant="primary" onClick={() => void start()}>
              <span className="material-symbols-rounded text-lg" aria-hidden>
                play_circle
              </span>
              Start focus mode
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
