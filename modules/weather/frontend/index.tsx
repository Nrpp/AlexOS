import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardLoading } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";
import { capitalize } from "@alexos/utils";

interface WeatherReading {
  condition: string;
  icon: string;
  temperature: number;
  high: number;
  low: number;
  location: string;
  units: "metric" | "imperial";
}

export interface WeatherWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

function unitSuffix(units: string): string {
  return units === "imperial" ? "°F" : "°C";
}

/** Reads on mount, then updates live from `weather.updated`. Backend data is mocked for now - see the module README. */
export default function WeatherWidget({ eventBus, apiBaseUrl }: WeatherWidgetProps) {
  const [reading, setReading] = useState<WeatherReading | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/weather/current`)
      .then((response) => response.json())
      .then((data: WeatherReading) => {
        if (!cancelled) setReading(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEventBus(eventBus, "weather.updated", (payload) => setReading(payload as WeatherReading));

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            {reading?.icon ?? "partly_cloudy_day"}
          </span>
        }
      >
        <CardTitle>Weather</CardTitle>
        <CardSubtitle>{reading?.location ?? "Local conditions"}</CardSubtitle>
      </CardHeader>
      <CardContent>
        {reading ? (
          <div className="flex items-baseline gap-3">
            <span className="text-heading font-semibold">
              {Math.round(reading.temperature)}
              {unitSuffix(reading.units)}
            </span>
            <span className="text-caption text-text-secondary">
              {capitalize(reading.condition)} &middot; H:{Math.round(reading.high)}&deg; L:
              {Math.round(reading.low)}&deg;
            </span>
          </div>
        ) : (
          <CardLoading />
        )}
      </CardContent>
    </Card>
  );
}
