import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardEmpty, CardLoading } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface VoiceDJState {
  agentOnline: boolean;
  mode: string; // "offline" | "idle" | "listening" | "playing"
  source: string | null; // "spotify" | "radio" | null
  speakerConnected: boolean;
  lastHeard: string;
  nowPlaying: string;
  detail: string;
}

export interface VoiceDJWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

const MODE_LABEL: Record<string, string> = {
  offline: "Agente apagado",
  idle: "En espera",
  listening: "Escuchando...",
  playing: "Reproduciendo",
};

const MODE_ICON: Record<string, string> = {
  offline: "mic_off",
  idle: "hearing",
  listening: "mic",
  playing: "graphic_eq",
};

/** Voice DJ status + manual controls. The listening and playback happen
 * in the host-side agent (see modules/voice_dj/README.md); this widget
 * just reflects its state and lets you trigger it by hand. */
export default function VoiceDJWidget({ eventBus, apiBaseUrl }: VoiceDJWidgetProps) {
  const [state, setState] = useState<VoiceDJState | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/voice_dj/state`)
      .then((response) => response.json())
      .then((data: VoiceDJState) => {
        if (!cancelled) setState(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEventBus(eventBus, "voice_dj.state", (payload) => setState(payload as VoiceDJState));

  const send = async (action: "play" | "stop") => {
    if (!apiBaseUrl) return;
    const init: RequestInit = { method: "POST" };
    if (action === "play") {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify({ action: "play" });
    }
    const response = await fetch(`${apiBaseUrl}/api/v1/modules/voice_dj/${action}`, init);
    if (response.ok) setState(await response.json());
  };

  const mode = state?.mode ?? "offline";
  const isPlaying = mode === "playing";

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            {MODE_ICON[mode] ?? "graphic_eq"}
          </span>
        }
      >
        <CardTitle>DJ por voz</CardTitle>
        <CardSubtitle>{MODE_LABEL[mode] ?? mode}</CardSubtitle>
      </CardHeader>

      {state === null ? (
        <CardLoading />
      ) : !state.agentOnline ? (
        <CardEmpty
          icon="mic_off"
          message='El agente de voz no esta activo en la Raspberry Pi. Inicialo con "systemctl --user start voice-dj".'
        />
      ) : (
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 text-caption text-text-secondary">
            <div className="flex items-center justify-between">
              <span>Altavoz</span>
              <span className={state.speakerConnected ? "text-accent-primary" : "text-text-secondary"}>
                {state.speakerConnected ? "conectado" : "desconectado"}
              </span>
            </div>
            {state.nowPlaying ? (
              <div className="flex items-center justify-between">
                <span>Sonando</span>
                <span className="text-text-primary">{state.nowPlaying}</span>
              </div>
            ) : null}
            {state.source ? (
              <div className="flex items-center justify-between">
                <span>Fuente</span>
                <span className="text-text-primary">{state.source === "spotify" ? "Spotify" : "Radio"}</span>
              </div>
            ) : null}
            {state.lastHeard ? (
              <div className="flex items-center justify-between">
                <span>Te escuche</span>
                <span className="text-text-primary">"{state.lastHeard}"</span>
              </div>
            ) : null}
            {state.detail ? <div className="text-text-secondary">{state.detail}</div> : null}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void send("play")}
              className="flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2 text-text-primary"
            >
              <span className="material-symbols-rounded text-xl" aria-hidden>
                play_arrow
              </span>
              Pon musica
            </button>
            <button
              type="button"
              onClick={() => void send("stop")}
              disabled={!isPlaying}
              className="flex items-center gap-2 rounded-full bg-surface-hover px-4 py-2 text-text-secondary hover:text-text-primary disabled:opacity-40"
            >
              <span className="material-symbols-rounded text-xl" aria-hidden>
                stop
              </span>
              Parar
            </button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
