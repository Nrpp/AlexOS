import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardError } from "@alexos/ui";

interface Headline {
  title: string;
  link: string;
  pubDate: string;
}

interface HeadlinesResponse {
  configured: boolean;
  headlines: Headline[];
}

export interface RssReaderWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real headlines from a configurable RSS/Atom feed (config.json's
 * feedUrl, defaults to BBC News) - parsed server-side with Python's
 * standard library, no new dependency needed. */
export default function RssReaderWidget({ apiBaseUrl }: RssReaderWidgetProps) {
  const [data, setData] = useState<HeadlinesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/rss_reader/headlines`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then((result: HeadlinesResponse) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the configured feed.");
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
            rss_feed
          </span>
        }
      >
        <CardTitle>Headlines</CardTitle>
      </CardHeader>
      {error ? (
        <CardError message={error} />
      ) : data === null ? (
        <CardLoading />
      ) : !data.configured ? (
        <CardEmpty icon="rss_feed" message="No feed configured - see modules/rss_reader/config.json." />
      ) : data.headlines.length === 0 ? (
        <CardEmpty icon="rss_feed" message="No headlines found." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {data.headlines.map((headline, index) => (
              <li key={index}>
                <a
                  href={headline.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block truncate text-body text-text-primary hover:text-accent-primary"
                >
                  {headline.title}
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
