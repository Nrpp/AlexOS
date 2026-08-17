import { useCallback, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardError, Button } from "@alexos/ui";

interface Headline {
  feedName: string;
  title: string;
  link: string;
  pubDate: string;
}

export interface NewsWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** On demand, not polled - "tell me today's news when I ask" rather
 * than a background feed. See modules/news/README.md. */
export default function NewsWidget({ apiBaseUrl }: NewsWidgetProps) {
  const [headlines, setHeadlines] = useState<Headline[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHeadlines = useCallback(() => {
    if (!apiBaseUrl) return;
    setLoading(true);
    fetch(`${apiBaseUrl}/api/v1/modules/news/headlines`)
      .then((response) => response.json())
      .then((result: { headlines: Headline[] }) => {
        setError(null);
        setHeadlines(result.headlines);
      })
      .catch(() => setError("Couldn't fetch the news right now."))
      .finally(() => setLoading(false));
  }, [apiBaseUrl]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            newspaper
          </span>
        }
        actions={
          <Button variant="secondary" onClick={fetchHeadlines} disabled={loading}>
            {loading ? "Loading..." : "Get today's news"}
          </Button>
        }
      >
        <CardTitle>News</CardTitle>
      </CardHeader>

      {error ? (
        <CardError message={error} onRetry={fetchHeadlines} />
      ) : loading ? (
        <CardLoading />
      ) : headlines === null ? (
        <CardEmpty icon="newspaper" message="Tap “Get today's news” to fetch the latest headlines." />
      ) : headlines.length === 0 ? (
        <CardEmpty icon="newspaper" message="No headlines right now." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-3">
            {headlines.map((headline, index) => (
              <li key={`${headline.link}-${index}`}>
                <a
                  href={headline.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-body text-text-primary hover:text-accent-primary"
                >
                  {headline.title}
                </a>
                <p className="text-caption text-text-secondary">{headline.feedName}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
