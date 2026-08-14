import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
}

export interface VocabularyBuilderWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real, persisted vocabulary builder (see modules/vocabulary_builder/backend). */
export default function VocabularyBuilderWidget({ apiBaseUrl }: VocabularyBuilderWidgetProps) {
  const [items, setItems] = useState<VocabularyWord[] | null>(null);
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/vocabulary_builder/items`)
      .then((response) => response.json())
      .then((result: VocabularyWord[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmedWord = word.trim();
    const trimmedDefinition = definition.trim();
    if (!trimmedWord || !trimmedDefinition || !apiBaseUrl) return;
    setWord("");
    setDefinition("");
    await fetch(`${apiBaseUrl}/api/v1/modules/vocabulary_builder/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: trimmedWord, definition: trimmedDefinition }),
    });
    refresh();
  };

  const deleteItem = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/vocabulary_builder/items/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            translate
          </span>
        }
      >
        <CardTitle>Vocabulary builder</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : items.length === 0 ? (
        <CardEmpty icon="translate" message="No words added yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-text-primary">{item.word}</p>
                  <p className="text-caption text-text-secondary">{item.definition}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  aria-label={`Delete ${item.word}`}
                  className="shrink-0 text-text-secondary transition-colors duration-base ease-out hover:text-danger"
                >
                  <span className="material-symbols-rounded text-lg" aria-hidden>
                    close
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <CardFooter className="flex-col items-stretch gap-2">
        <Input
          value={word}
          onChange={(event) => setWord(event.target.value)}
          placeholder="Word..."
          aria-label="New word"
        />
        <div className="flex gap-2">
          <Input
            value={definition}
            onChange={(event) => setDefinition(event.target.value)}
            placeholder="Definition..."
            aria-label="Definition"
            className="flex-1"
          />
          <Button variant="secondary" onClick={() => void addItem()}>
            Add
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
