import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardLoading, CardError } from "@alexos/ui";

interface Apod {
  title: string;
  explanation: string;
  imageUrl: string;
  mediaType: string;
  date: string;
}

export interface AstronomyPhotoWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

/** Real data via NASA's APOD API - works with zero setup using NASA's
 * public DEMO_KEY; set NASA_API_KEY in .env for higher rate limits
 * (see modules/astronomy_photo/backend/router.py). */
export default function AstronomyPhotoWidget({ apiBaseUrl }: AstronomyPhotoWidgetProps) {
  const [apod, setApod] = useState<Apod | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/astronomy_photo/today`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then((result: Apod) => {
        if (!cancelled) setApod(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach NASA's APOD API.");
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
            nights_stay
          </span>
        }
      >
        <CardTitle>Astronomy photo</CardTitle>
      </CardHeader>
      {error ? (
        <CardError message={error} />
      ) : apod === null ? (
        <CardLoading />
      ) : (
        <CardContent className="flex flex-col gap-2">
          {apod.mediaType === "image" && apod.imageUrl ? (
            <img src={apod.imageUrl} alt={apod.title} className="w-full rounded-button object-cover" />
          ) : null}
          <p className="text-body font-semibold text-text-primary">{apod.title}</p>
          <p className="text-caption text-text-secondary">{truncate(apod.explanation, 160)}</p>
        </CardContent>
      )}
    </Card>
  );
}
