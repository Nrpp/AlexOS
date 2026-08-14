import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, Input, Button } from "@alexos/ui";

interface SynonymsResult {
  word: string;
  synonyms: string[];
}

export interface ThesaurusWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real synonyms via the Datamuse API - free, no API key. */
export default function ThesaurusWidget({ apiBaseUrl }: ThesaurusWidgetProps) {
  const [word, setWord] = useState("");
  const [result, setResult] = useState<SynonymsResult | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    const trimmed = word.trim();
    if (!trimmed || !apiBaseUrl) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/thesaurus/synonyms?word=${encodeURIComponent(trimmed)}`);
      const data: SynonymsResult = await response.json();
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
            sync_alt
          </span>
        }
      >
        <CardTitle>Thesaurus</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={word}
            onChange={(event) => setWord(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void lookup()}
            placeholder="Find synonyms for..."
            aria-label="Word to find synonyms for"
            className="flex-1"
          />
          <Button variant="secondary" disabled={loading} onClick={() => void lookup()}>
            {loading ? "..." : "Find"}
          </Button>
        </div>
        {result && result.synonyms.length === 0 ? <CardEmpty icon="search_off" message="No synonyms found." /> : null}
        {result && result.synonyms.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.synonyms.map((synonym) => (
              <span key={synonym} className="rounded-button border border-border px-3 py-1 text-caption text-text-primary">
                {synonym}
              </span>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
