import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface FlashcardsWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real, persisted flashcards (see modules/flashcards/backend). Click a
 * card to flip it - the flipped state is local/client-side only, not
 * persisted. */
export default function FlashcardsWidget({ apiBaseUrl }: FlashcardsWidgetProps) {
  const [items, setItems] = useState<Flashcard[] | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/flashcards/items`)
      .then((response) => response.json())
      .then((result: Flashcard[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmedFront = front.trim();
    const trimmedBack = back.trim();
    if (!trimmedFront || !trimmedBack || !apiBaseUrl) return;
    setFront("");
    setBack("");
    await fetch(`${apiBaseUrl}/api/v1/modules/flashcards/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front: trimmedFront, back: trimmedBack }),
    });
    refresh();
  };

  const deleteItem = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/flashcards/items/${id}`, { method: "DELETE" });
    refresh();
  };

  const toggleFlip = (id: string) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") void addItem();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            style
          </span>
        }
      >
        <CardTitle>Flashcards</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : items.length === 0 ? (
        <CardEmpty icon="style" message="No flashcards yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-button border border-border p-3"
              >
                <button
                  type="button"
                  onClick={() => toggleFlip(item.id)}
                  className="flex-1 text-left text-body text-text-primary transition-colors duration-base ease-out"
                >
                  {flipped.has(item.id) ? item.back : item.front}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  aria-label={`Delete card ${item.front}`}
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
          value={front}
          onChange={(event) => setFront(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Front (question/term)"
          aria-label="New flashcard front"
        />
        <div className="flex gap-2">
          <Input
            value={back}
            onChange={(event) => setBack(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Back (answer/definition)"
            aria-label="New flashcard back"
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
