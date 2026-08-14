import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, Input, Button } from "@alexos/ui";

interface Meaning {
  partOfSpeech: string;
  definition: string;
  example: string | null;
}

interface LookupResult {
  found: boolean;
  word: string;
  phonetic: string | null;
  meanings: Meaning[];
}

export interface DictionaryWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real definitions via the Free Dictionary API - free, no API key. */
export default function DictionaryWidget({ apiBaseUrl }: DictionaryWidgetProps) {
  const [word, setWord] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    const trimmed = word.trim();
    if (!trimmed || !apiBaseUrl) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/dictionary/lookup?word=${encodeURIComponent(trimmed)}`);
      const data: LookupResult = await response.json();
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
            menu_book
          </span>
        }
      >
        <CardTitle>Dictionary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={word}
            onChange={(event) => setWord(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void lookup()}
            placeholder="Look up a word..."
            aria-label="Word to look up"
            className="flex-1"
          />
          <Button variant="secondary" disabled={loading} onClick={() => void lookup()}>
            {loading ? "..." : "Look up"}
          </Button>
        </div>
        {result && !result.found ? <CardEmpty icon="search_off" message={`No definition found for "${result.word}".`} /> : null}
        {result?.found ? (
          <div>
            <p className="text-body font-semibold text-text-primary">
              {result.word}
              {result.phonetic ? <span className="ml-2 text-caption text-text-secondary">{result.phonetic}</span> : null}
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {result.meanings.slice(0, 3).map((meaning, index) => (
                <li key={index}>
                  <p className="text-caption italic text-text-secondary">{meaning.partOfSpeech}</p>
                  <p className="text-body text-text-primary">{meaning.definition}</p>
                  {meaning.example ? <p className="text-caption text-text-secondary">&ldquo;{meaning.example}&rdquo;</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
