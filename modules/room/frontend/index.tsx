import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardEmpty, CardLoading, Toggle, Button } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface Light {
  id: string;
  name: string;
  on: boolean;
  brightness: number;
}

interface LightsResponse {
  configured: boolean;
  lights: Light[];
}

export interface RoomWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

const SCENES: { name: string; label: string; icon: string }[] = [
  { name: "focus", label: "Focus", icon: "center_focus_strong" },
  { name: "sleep", label: "Sleep", icon: "bedtime" },
  { name: "morning", label: "Morning", icon: "wb_twilight" },
];

/** Real lights via Home Assistant - see the module README to connect yours. */
export default function RoomWidget({ eventBus, apiBaseUrl }: RoomWidgetProps) {
  const [data, setData] = useState<LightsResponse | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/room/lights`)
      .then((response) => response.json())
      .then((result: LightsResponse) => setData(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "room.updated", refresh);

  const toggleLight = async (light: Light) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/room/lights/${light.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on: !light.on }),
    });
    refresh();
  };

  const applyScene = async (sceneName: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/room/scenes/${sceneName}`, { method: "POST" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            living
          </span>
        }
      >
        <CardTitle>Room</CardTitle>
      </CardHeader>

      {data === null ? (
        <CardLoading />
      ) : !data.configured ? (
        <CardEmpty
          icon="home"
          message="Home Assistant isn't connected yet - see modules/room/README.md."
        />
      ) : data.lights.length === 0 ? (
        <CardEmpty icon="lightbulb" message="No lights configured yet - add entity IDs to modules/room/config.json." />
      ) : (
        <CardContent className="flex flex-col gap-3">
          {data.lights.map((light) => (
            <div key={light.id} className="flex items-center justify-between">
              <div>
                <p className="text-body text-text-primary">{light.name}</p>
                <p className="text-caption text-text-secondary">{light.brightness}%</p>
              </div>
              <Toggle checked={light.on} onCheckedChange={() => void toggleLight(light)} label={light.name} />
            </div>
          ))}
        </CardContent>
      )}

      {data?.configured ? (
        <CardFooter className="justify-start gap-2">
          {SCENES.map((scene) => (
            <Button key={scene.name} variant="secondary" onClick={() => void applyScene(scene.name)}>
              <span className="material-symbols-rounded text-lg" aria-hidden>
                {scene.icon}
              </span>
              {scene.label}
            </Button>
          ))}
        </CardFooter>
      ) : null}
    </Card>
  );
}
