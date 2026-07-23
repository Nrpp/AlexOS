import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardLoading, CardError } from "@alexos/ui";
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

/** Real weather via Open-Meteo - see the module README to set your location. */
export default function WeatherWidget({ eventBus, apiBaseUrl }: WeatherWidgetProps) {
  const [reading, setReading] = useState<WeatherReading | null>(null);
  const [failed, setFailed] = useState(false);

  const fetchReading = useCallback(() => {
    if (!apiBaseUrl) return;
    setFailed(false);
    fetch(`${apiBaseUrl}/api/v1/modules/weather/current`)
      .then((response) => {
        if (!response.ok) throw new Error("weather request failed");
        return response.json() as Promise<WeatherReading>;
      })
      .then((data) => setReading(data))
      .catch(() => setFailed(true));
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchReading();
  }, [fetchReading]);

  useEventBus(eventBus, "weather.updated", (payload) => {
    setFailed(false);
    setReading(payload as WeatherReading);
  });

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
      {failed && !reading ? (
        <CardError message="We couldn't reach the weather service." onRetry={fetchReading} />
      ) : reading ? (
        <CardContent>
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
        </CardContent>
      ) : (
        <CardLoading />
      )}
    </Card>
  );
}
