import { useCallback, useEffect, useState } from "react";
import type { TextareaHTMLAttributes } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardEmpty,
  CardLoading,
  CardFooter,
  Dialog,
  DialogContent,
  Input,
  Button,
} from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

export interface NotesWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** No shared Textarea primitive exists yet (packages/ui only has
 * single-line Input) - styled to match Input's look directly here;
 * worth extracting if a second module ends up needing one. */
function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-[120px] w-full resize-none rounded-button border border-border bg-background-secondary px-4 py-3 text-body text-text-primary placeholder:text-text-secondary outline-none transition-colors duration-base ease-out focus-visible:ring-2 focus-visible:ring-accent-primary"
    />
  );
}

interface NoteEditorDialogProps {
  open: boolean;
  note: Note | null;
  onClose: () => void;
  onSave: (title: string, body: string) => void;
  onDelete?: () => void;
}

function NoteEditorDialog({ open, note, onClose, onSave, onDelete }: NoteEditorDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    setTitle(note?.title ?? "");
    setBody(note?.body ?? "");
  }, [note, open]);

  const save = () => {
    if (!title.trim()) return;
    onSave(title.trim(), body);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        title={note ? "Edit note" : "New note"}
        primaryAction={
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        }
        secondaryAction={
          onDelete ? (
            <Button variant="ghost" onClick={onDelete}>
              Delete
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title..."
            aria-label="Note title"
          />
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write something..."
            aria-label="Note body"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Real, persisted notes (see modules/notes/backend) - create, edit,
 * and delete. Home's "New note" quick action opens the same dialog
 * this widget uses (see apps/web/src/pages/Home/index.tsx). */
export default function NotesWidget({ eventBus, apiBaseUrl }: NotesWidgetProps) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/notes/notes`)
      .then((response) => response.json())
      .then((result: Note[]) => setNotes(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "notes.updated", (payload) => setNotes((payload as { notes: Note[] }).notes));

  const createNote = async (title: string, body: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/notes/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setCreating(false);
    refresh();
  };

  const saveNote = async (title: string, body: string) => {
    if (!apiBaseUrl || !editingNote) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/notes/notes/${editingNote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setEditingNote(null);
    refresh();
  };

  const deleteNote = async () => {
    if (!apiBaseUrl || !editingNote) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/notes/notes/${editingNote.id}`, { method: "DELETE" });
    setEditingNote(null);
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            note
          </span>
        }
      >
        <CardTitle>Notes</CardTitle>
      </CardHeader>

      {notes === null ? (
        <CardLoading />
      ) : notes.length === 0 ? (
        <CardEmpty icon="note_add" message="No notes yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => setEditingNote(note)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="truncate text-body text-text-primary">{note.title}</span>
                  <span className="shrink-0 text-caption text-text-secondary">{formatUpdatedAt(note.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <CardFooter className="justify-start">
        <Button variant="secondary" onClick={() => setCreating(true)}>
          <span className="material-symbols-rounded text-lg" aria-hidden>
            note_add
          </span>
          New note
        </Button>
      </CardFooter>

      <NoteEditorDialog
        open={creating}
        note={null}
        onClose={() => setCreating(false)}
        onSave={(title, body) => void createNote(title, body)}
      />
      <NoteEditorDialog
        open={editingNote !== null}
        note={editingNote}
        onClose={() => setEditingNote(null)}
        onSave={(title, body) => void saveNote(title, body)}
        onDelete={() => void deleteNote()}
      />
    </Card>
  );
}
