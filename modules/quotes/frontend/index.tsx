import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardLoading, CardError, Button } from "@alexos/ui";

interface Quote {
  quote: string;
  author: string;
}

export interface QuotesWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real quotes via ZenQuotes (zenquotes.io) - free, no API key. */
export default function QuotesWidget({ apiBaseUrl }: QuotesWidgetProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    setError(null);
    fetch(`${apiBaseUrl}/api/v1/modules/quotes/quote`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then((result: Quote) => setQuote(result))
      .catch(() => setError("Couldn't reach ZenQuotes."));
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            format_quote
          </span>
        }
        actions={
          <Button variant="ghost" onClick={refresh}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              refresh
            </span>
          </Button>
        }
      >
        <CardTitle>Quote</CardTitle>
      </CardHeader>
      {error ? (
        <CardError message={error} onRetry={refresh} />
      ) : quote === null ? (
        <CardLoading />
      ) : (
        <CardContent>
          <p className="text-body italic text-text-primary">&ldquo;{quote.quote}&rdquo;</p>
          <p className="mt-2 text-caption text-text-secondary">&mdash; {quote.author}</p>
        </CardContent>
      )}
    </Card>
  );
}
