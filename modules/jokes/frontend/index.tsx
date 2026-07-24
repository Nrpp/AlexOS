import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardLoading, CardError, Button } from "@alexos/ui";

interface Joke {
  setup: string;
  punchline: string;
}

export interface JokesWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real jokes via the Official Joke API (official-joke-api.appspot.com)
 * - free, no API key. */
export default function JokesWidget({ apiBaseUrl }: JokesWidgetProps) {
  const [joke, setJoke] = useState<Joke | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    setError(null);
    setRevealed(false);
    fetch(`${apiBaseUrl}/api/v1/modules/jokes/joke`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then((result: Joke) => setJoke(result))
      .catch(() => setError("Couldn't reach the joke service."));
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            sentiment_very_satisfied
          </span>
        }
      >
        <CardTitle>Joke</CardTitle>
      </CardHeader>
      {error ? (
        <CardError message={error} onRetry={refresh} />
      ) : joke === null ? (
        <CardLoading />
      ) : (
        <CardContent className="flex flex-col gap-3">
          <p className="text-body text-text-primary">{joke.setup}</p>
          {revealed ? (
            <p className="text-body font-semibold text-accent-primary">{joke.punchline}</p>
          ) : (
            <Button variant="secondary" onClick={() => setRevealed(true)}>
              Reveal punchline
            </Button>
          )}
          <Button variant="ghost" onClick={refresh}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              refresh
            </span>
            Another one
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
