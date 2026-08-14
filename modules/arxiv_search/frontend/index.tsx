import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, Input, Button } from "@alexos/ui";

interface Paper {
  title: string;
  summary: string;
  url: string;
  authors: string[];
  published: string;
}

export interface ArxivSearchWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real academic paper search via arXiv's public API - free, no API key. */
export default function ArxivSearchWidget({ apiBaseUrl }: ArxivSearchWidgetProps) {
  const [query, setQuery] = useState("");
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    const trimmed = query.trim();
    if (!trimmed || !apiBaseUrl) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/arxiv_search/search?query=${encodeURIComponent(trimmed)}`);
      const data: { papers: Paper[] } = await response.json();
      setPapers(data.papers);
    } catch {
      setPapers(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            science
          </span>
        }
      >
        <CardTitle>arXiv search</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void search()}
            placeholder="Search papers..."
            aria-label="arXiv search query"
            className="flex-1"
          />
          <Button variant="secondary" disabled={loading} onClick={() => void search()}>
            {loading ? "..." : "Search"}
          </Button>
        </div>
        {papers && papers.length === 0 ? <CardEmpty icon="search_off" message="No papers found." /> : null}
        {papers && papers.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {papers.map((paper) => (
              <li key={paper.url}>
                <a href={paper.url} target="_blank" rel="noreferrer noopener" className="text-body text-text-primary hover:text-accent-primary">
                  {paper.title}
                </a>
                <p className="text-caption text-text-secondary">{paper.authors.slice(0, 3).join(", ")}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
