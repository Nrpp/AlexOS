import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardEmpty, CardLoading } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface Message {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  unread: boolean;
  receivedAt: string;
}

export interface CommunicationWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

/** Mock inbox for now - see the module README for what going real needs. */
export default function CommunicationWidget({ eventBus, apiBaseUrl }: CommunicationWidgetProps) {
  const [messages, setMessages] = useState<Message[] | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/communication/messages`)
      .then((response) => response.json())
      .then((data: Message[]) => setMessages(data))
      .catch(() => setMessages((current) => current ?? []));
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "mail.received", refresh);

  const markRead = async (message: Message) => {
    if (!apiBaseUrl || !message.unread) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/communication/messages/${message.id}`, { method: "PATCH" });
    refresh();
  };

  const unreadCount = messages?.filter((message) => message.unread).length ?? 0;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            forum
          </span>
        }
      >
        <CardTitle>Inbox</CardTitle>
        <CardSubtitle>{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</CardSubtitle>
      </CardHeader>

      {messages === null ? (
        <CardLoading />
      ) : messages.length === 0 ? (
        <CardEmpty icon="mark_email_read" message="No messages." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-3">
            {messages.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => void markRead(message)}
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
    </Card>
  );
}
