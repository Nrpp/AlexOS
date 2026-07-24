import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardContent,
  CardEmpty,
  CardLoading,
  Dialog,
  DialogContent,
  CardError,
  Toggle,
} from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface Message {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  unread: boolean;
}

interface MessagesResponse {
  configured: boolean;
  messages: Message[];
}

interface FullMessage {
  id: string;
  sender: string;
  subject: string;
  date: string;
  body: string;
}

interface MessageViewerDialogProps {
  messageId: string | null;
  apiBaseUrl?: string | undefined;
  onClose: () => void;
  onRead: () => void;
}

/** Fetches and displays a message's full body on demand - kept separate
 * from the inbox list so opening one email doesn't cost every other
 * item a re-render. Body arrives pre-rendered as plain text (the
 * backend strips HTML server-side) rather than raw HTML, so there's no
 * need for a sanitizer just to safely display someone else's markup. */
function MessageViewerDialog({ messageId, apiBaseUrl, onClose, onRead }: MessageViewerDialogProps) {
  const [message, setMessage] = useState<FullMessage | null>(null);

  useEffect(() => {
    if (!messageId || !apiBaseUrl) {
      setMessage(null);
      return;
    }
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/communication/messages/${messageId}`)
      .then((response) => response.json())
      .then((result: FullMessage) => {
        if (!cancelled) setMessage(result);
        onRead();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, apiBaseUrl]);

  return (
    <Dialog open={messageId !== null} onOpenChange={(open) => !open && onClose()}>
      {messageId !== null ? (
        <DialogContent
          title={message?.subject || "Loading..."}
          {...(message ? { description: `${message.sender} · ${message.date}` } : {})}
          className="max-h-[80vh] w-[min(640px,90vw)] overflow-y-auto"
        >
          {message ? (
            <p className="whitespace-pre-wrap text-body text-text-primary">{message.body || "(No body content.)"}</p>
          ) : (
            <CardLoading />
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

export interface CommunicationWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

/** Real inbox via Gmail - see the module README to connect yours.
 * Clicking a message opens its full body (MessageViewerDialog), which
 * also marks it read server-side - matching real Gmail's behavior of
 * marking-as-read on open rather than needing a separate action. */
export default function CommunicationWidget({ eventBus, apiBaseUrl }: CommunicationWidgetProps) {
  const [data, setData] = useState<MessagesResponse | null>(null);
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/communication/messages`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail || `Request failed (${response.status})`);
        }
        setError(null);
        return response.json();
      })
      .then((result: MessagesResponse) => setData(result))
      .catch((err: Error) => setError(err.message));
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "mail.received", refresh);

  const unreadCount = data?.messages.filter((message) => message.unread).length ?? 0;
  const visibleMessages = (data?.messages ?? []).filter((message) => !unreadOnly || message.unread);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            forum
          </span>
        }
        actions={
          data?.configured ? (
            <div className="flex items-center gap-2">
              <span className="text-caption text-text-secondary">Unread only</span>
              <Toggle checked={unreadOnly} onCheckedChange={setUnreadOnly} label="Show unread only" />
            </div>
          ) : undefined
        }
      >
        <CardTitle>Inbox</CardTitle>
        <CardSubtitle>{data?.configured ? (unreadCount > 0 ? `${unreadCount} unread` : "All caught up") : ""}</CardSubtitle>
      </CardHeader>

      {error ? (
        <CardError message={error} onRetry={refresh} />
      ) : data === null ? (
        <CardLoading />
      ) : !data.configured ? (
        <CardEmpty icon="mail" message="Gmail isn't connected yet - see modules/communication/README.md." />
      ) : data.messages.length === 0 ? (
        <CardEmpty icon="mark_email_read" message="No messages." />
      ) : visibleMessages.length === 0 ? (
        <CardEmpty icon="mark_email_read" message="No unread messages." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-3">
            {visibleMessages.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => setOpenMessageId(message.id)}
                  className="flex w-full items-start gap-2 text-left"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${message.unread ? "bg-accent-primary" : "bg-transparent"}`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p
                      className={`truncate text-body ${message.unread ? "font-semibold text-text-primary" : "text-text-secondary"}`}
                    >
                      {message.sender} &middot; {message.subject}
                    </p>
                    <p className="truncate text-caption text-text-secondary">{message.snippet}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <MessageViewerDialog
        messageId={openMessageId}
        apiBaseUrl={apiBaseUrl}
        onClose={() => setOpenMessageId(null)}
        onRead={refresh}
      />
    </Card>
  );
}
