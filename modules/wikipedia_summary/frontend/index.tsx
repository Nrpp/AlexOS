import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, Input, Button } from "@alexos/ui";

interface SummaryResult {
  found: boolean;
  title: string;
  extract: string | null;
  url: string | null;
}

export interface WikipediaSummaryWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real article summaries via Wikipedia's REST API - free, no API key. */
export default function WikipediaSummaryWidget({ apiBaseUrl }: WikipediaSummaryWidgetProps) {
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    const trimmed = title.trim();
    if (!trimmed || !apiBaseUrl) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/wikipedia_summary/summary?title=${encodeURIComponent(trimmed)}`);
      const data: SummaryResult = await response.json();
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            public
          </span>
        }
      >
        <CardTitle>Wikipedia</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void lookup()}
            placeholder="Search a topic..."
            aria-label="Wikipedia topic"
            className="flex-1"
          />
          <Button variant="secondary" disabled={loading} onClick={() => void lookup()}>
            {loading ? "..." : "Search"}
          </Button>
        </div>
        {result && !result.found ? <CardEmpty icon="search_off" message={`No article found for "${result.title}".`} /> : null}
        {result?.found ? (
          <div>
            <p className="text-body font-semibold text-text-primary">{result.title}</p>
            <p className="mt-1 text-caption text-text-secondary">{result.extract}</p>
            {result.url ? (
              <a href={result.url} target="_blank" rel="noreferrer noopener" className="mt-2 inline-block text-caption text-accent-primary">
                Read more
              </a>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
