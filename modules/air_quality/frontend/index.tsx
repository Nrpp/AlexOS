import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardLoading, CardError } from "@alexos/ui";

interface AirQuality {
  usAqi: number | null;
  pm25: number | null;
  category: string;
}

export interface AirQualityWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

const CATEGORY_COLOR: Record<string, string> = {
  Good: "text-success",
  Moderate: "text-warning",
  "Unhealthy for Sensitive Groups": "text-warning",
  Unhealthy: "text-danger",
  "Very Unhealthy": "text-danger",
  Hazardous: "text-danger",
};

/** Real air quality via Open-Meteo's Air Quality API - free, no API
 * key. Location comes from config.json (same lat/long pattern as
 * modules/weather). */
export default function AirQualityWidget({ apiBaseUrl }: AirQualityWidgetProps) {
  const [data, setData] = useState<AirQuality | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/air_quality/current`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then((result: AirQuality) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach Open-Meteo.");
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            airwave
          </span>
        }
      >
        <CardTitle>Air quality</CardTitle>
      </CardHeader>
      {error ? (
        <CardError message={error} />
      ) : data === null ? (
        <CardLoading />
      ) : (
        <CardContent className="flex flex-col items-center gap-1 py-2">
          <span className="text-display font-semibold tabular-nums text-text-primary">{data.usAqi ?? "-"}</span>
          <span className={`text-body font-semibold ${CATEGORY_COLOR[data.category] ?? "text-text-secondary"}`}>
            {data.category}
          </span>
          {data.pm25 !== null ? (
            <span className="text-caption text-text-secondary">PM2.5: {data.pm25} &micro;g/m&sup3;</span>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}
