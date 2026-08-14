import { useCallback, useEffect, useState } from "react";
import type { TextareaHTMLAttributes } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface CheatSheetEntry {
  id: string;
  title: string;
  content: string;
}

export interface CheatSheetWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** No shared Textarea primitive exists yet (packages/ui only has
 * single-line Input) - styled to match Input's look directly here. */
function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-[100px] w-full resize-none rounded-button border border-border bg-background-secondary px-4 py-3 text-body text-text-primary placeholder:text-text-secondary outline-none transition-colors duration-base ease-out focus-visible:ring-2 focus-visible:ring-accent-primary"
    />
  );
}

/** Real, persisted cheat sheet (see modules/cheat_sheet/backend). */
export default function CheatSheetWidget({ apiBaseUrl }: CheatSheetWidgetProps) {
  const [items, setItems] = useState<CheatSheetEntry[] | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/cheat_sheet/items`)
      .then((response) => response.json())
      .then((result: CheatSheetEntry[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent || !apiBaseUrl) return;
    setTitle("");
    setContent("");
    await fetch(`${apiBaseUrl}/api/v1/modules/cheat_sheet/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmedTitle, content: trimmedContent }),
    });
    refresh();
  };

  const deleteItem = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/cheat_sheet/items/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            sticky_note_2
          </span>
        }
      >
        <CardTitle>Cheat sheet</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : items.length === 0 ? (
        <CardEmpty icon="sticky_note_2" message="No notes added yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-button border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-body font-semibold text-text-primary">{item.title}</h4>
                  <button
                    type="button"
                    onClick={() => void deleteItem(item.id)}
                    aria-label={`Delete ${item.title}`}
                    className="shrink-0 text-text-secondary transition-colors duration-base ease-out hover:text-danger"
                  >
                    <span className="material-symbols-rounded text-lg" aria-hidden>
                      close
                    </span>
                  </button>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-caption text-text-secondary">{item.content}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <CardFooter className="flex-col items-stretch gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title..."
          aria-label="New cheat sheet title"
        />
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Formulas, notes..."
          aria-label="Cheat sheet content"
        />
        <Button variant="secondary" onClick={() => void addItem()} className="self-end">
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
