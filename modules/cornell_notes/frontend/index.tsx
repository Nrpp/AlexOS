import { useCallback, useEffect, useState } from "react";
import type { TextareaHTMLAttributes } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface CornellNote {
  id: string;
  title: string;
  cues: string;
  notes: string;
  summary: string;
}

export interface CornellNotesWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** No shared Textarea primitive exists yet (packages/ui only has
 * single-line Input) - styled to match Input's look directly here. */
function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-[70px] w-full resize-none rounded-button border border-border bg-background-secondary px-4 py-3 text-body text-text-primary placeholder:text-text-secondary outline-none transition-colors duration-base ease-out focus-visible:ring-2 focus-visible:ring-accent-primary"
    />
  );
}

/** Real, persisted Cornell notes (see modules/cornell_notes/backend). */
export default function CornellNotesWidget({ apiBaseUrl }: CornellNotesWidgetProps) {
  const [items, setItems] = useState<CornellNote[] | null>(null);
  const [title, setTitle] = useState("");
  const [cues, setCues] = useState("");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/cornell_notes/items`)
      .then((response) => response.json())
      .then((result: CornellNote[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !apiBaseUrl) return;
    setTitle("");
    setCues("");
    setNotes("");
    setSummary("");
    await fetch(`${apiBaseUrl}/api/v1/modules/cornell_notes/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmedTitle, cues, notes, summary }),
    });
    refresh();
  };

  const deleteItem = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/cornell_notes/items/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            note_alt
          </span>
        }
      >
        <CardTitle>Cornell notes</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : items.length === 0 ? (
        <CardEmpty icon="note_alt" message="No notes added yet." />
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
                <div className="mt-2 flex flex-col gap-2">
                  <div>
                    <p className="text-caption font-semibold text-text-secondary">Cues</p>
                    <p className="whitespace-pre-wrap text-caption text-text-primary">{item.cues}</p>
                  </div>
                  <div>
                    <p className="text-caption font-semibold text-text-secondary">Notes</p>
                    <p className="whitespace-pre-wrap text-caption text-text-primary">{item.notes}</p>
                  </div>
                  <div>
                    <p className="text-caption font-semibold text-text-secondary">Summary</p>
                    <p className="whitespace-pre-wrap text-caption text-text-primary">{item.summary}</p>
                  </div>
                </div>
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
          aria-label="New note title"
        />
        <Textarea
          value={cues}
          onChange={(event) => setCues(event.target.value)}
          placeholder="Cues..."
          aria-label="Cues"
        />
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes..."
          aria-label="Notes"
        />
        <Textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Summary..."
          aria-label="Summary"
        />
        <Button variant="secondary" onClick={() => void addItem()} className="self-end">
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
