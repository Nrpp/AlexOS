import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface Bookmark {
  id: string;
  title: string;
  url: string;
}

export interface BookmarksWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Real, persisted bookmarks (see modules/bookmarks/backend). */
export default function BookmarksWidget({ apiBaseUrl }: BookmarksWidgetProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/bookmarks/bookmarks`)
      .then((response) => response.json())
      .then((result: Bookmark[]) => setBookmarks(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addBookmark = async () => {
    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();
    if (!trimmedTitle || !trimmedUrl || !apiBaseUrl) return;
    setTitle("");
    setUrl("");
    await fetch(`${apiBaseUrl}/api/v1/modules/bookmarks/bookmarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmedTitle, url: normalizeUrl(trimmedUrl) }),
    });
    refresh();
  };

  const removeBookmark = async (bookmarkId: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/bookmarks/bookmarks/${bookmarkId}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            bookmark
          </span>
        }
      >
        <CardTitle>Bookmarks</CardTitle>
      </CardHeader>

      {bookmarks === null ? (
        <CardLoading />
      ) : bookmarks.length === 0 ? (
        <CardEmpty icon="bookmark_border" message="No bookmarks yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {bookmarks.map((bookmark) => (
              <li key={bookmark.id} className="flex items-center justify-between gap-3">
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="min-w-0 flex-1 truncate text-body text-text-primary hover:text-accent-primary"
                >
                  {bookmark.title}
                </a>
                <button
                  type="button"
                  onClick={() => void removeBookmark(bookmark.id)}
                  aria-label={`Remove ${bookmark.title}`}
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
          placeholder="Title..."
          aria-label="New bookmark title"
        />
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="example.com"
            aria-label="New bookmark URL"
            className="flex-1"
          />
          <Button variant="secondary" onClick={() => void addBookmark()}>
            Add
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
