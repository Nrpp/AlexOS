import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface Book {
  id: string;
  title: string;
  author: string;
  status: "want" | "reading" | "done";
}

export interface ReadingListWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

const STATUS_LABEL: Record<Book["status"], string> = { want: "Want to read", reading: "Reading", done: "Done" };
const NEXT_STATUS: Record<Book["status"], Book["status"]> = { want: "reading", reading: "done", done: "want" };

/** Real, persisted reading list (see modules/reading_list/backend). */
export default function ReadingListWidget({ apiBaseUrl }: ReadingListWidgetProps) {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/reading_list/books`)
      .then((response) => response.json())
      .then((result: Book[]) => setBooks(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addBook = async () => {
    const trimmed = title.trim();
    if (!trimmed || !apiBaseUrl) return;
    setTitle("");
    setAuthor("");
    await fetch(`${apiBaseUrl}/api/v1/modules/reading_list/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed, author: author.trim() }),
    });
    refresh();
  };

  const cycleStatus = async (book: Book) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/reading_list/books/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: NEXT_STATUS[book.status] }),
    });
    refresh();
  };

  const removeBook = async (bookId: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/reading_list/books/${bookId}`, { method: "DELETE" });
    refresh();
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
        <CardTitle>Reading list</CardTitle>
      </CardHeader>

      {books === null ? (
        <CardLoading />
      ) : books.length === 0 ? (
        <CardEmpty icon="menu_book" message="No books yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {books.map((book) => (
              <li key={book.id} className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => void cycleStatus(book)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-body text-text-primary">{book.title}</p>
                  <p className="truncate text-caption text-text-secondary">
                    {book.author ? `${book.author} · ` : ""}
                    {STATUS_LABEL[book.status]}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => void removeBook(book.id)}
                  aria-label={`Remove ${book.title}`}
                  className="text-text-secondary hover:text-danger"
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
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Book title..."
          aria-label="New book title"
        />
        <div className="flex gap-2">
          <Input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="Author (optional)"
            aria-label="Book author"
            className="flex-1"
          />
          <Button variant="secondary" onClick={() => void addBook()}>
            Add
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
