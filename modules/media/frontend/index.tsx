import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardLoading } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface PlayerState {
  title: string;
  artist: string;
  durationSeconds: number;
  positionSeconds: number;
  isPlaying: boolean;
}

export interface MediaWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Mock player for now - see the module README for what going real needs. */
export default function MediaWidget({ eventBus, apiBaseUrl }: MediaWidgetProps) {
  const [state, setState] = useState<PlayerState | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/media/now-playing`)
      .then((response) => response.json())
      .then((data: PlayerState) => {
        if (!cancelled) setState(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEventBus(eventBus, "media.updated", (payload) => setState(payload as PlayerState));

  const sendAction = async (action: "play" | "pause" | "next" | "previous") => {
    if (!apiBaseUrl) return;
    const response = await fetch(`${apiBaseUrl}/api/v1/modules/media/playback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setState(await response.json());
  };

  const percent = state ? Math.min(100, Math.round((state.positionSeconds / state.durationSeconds) * 100)) : 0;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            music_note
          </span>
        }
      >
        <CardTitle>{state?.title ?? "Media"}</CardTitle>
        <CardSubtitle>{state?.artist ?? "Nothing playing"}</CardSubtitle>
      </CardHeader>
      {state ? (
        <CardContent className="flex flex-col gap-3">
          <div>
            <div className="h-1.5 rounded-full bg-surface-hover">
              <div
                className="h-1.5 rounded-full bg-accent-primary transition-all duration-base ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-caption text-text-secondary">
              <span>{formatDuration(state.positionSeconds)}</span>
              <span>{formatDuration(state.durationSeconds)}</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => void sendAction("previous")}
              aria-label="Previous track"
              className="text-text-secondary hover:text-text-primary"
            >
              <span className="material-symbols-rounded text-2xl" aria-hidden>
                skip_previous
              </span>
            </button>
            <button
              type="button"
              onClick={() => void sendAction(state.isPlaying ? "pause" : "play")}
              aria-label={state.isPlaying ? "Pause" : "Play"}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary text-text-primary"
            >
              <span className="material-symbols-rounded text-2xl" aria-hidden>
                {state.isPlaying ? "pause" : "play_arrow"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void sendAction("next")}
              aria-label="Next track"
              className="text-text-secondary hover:text-text-primary"
            >
              <span className="material-symbols-rounded text-2xl" aria-hidden>
                skip_next
              </span>
            </button>
          </div>
        </CardContent>
      ) : (
        <CardLoading />
      )}
    </Card>
  );
}
