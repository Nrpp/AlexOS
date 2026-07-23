import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardContent,
  CardFooter,
  Input,
  Button,
} from "@alexos/ui";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

export interface AssistantWidgetProps {
  /** Unused - replies come back synchronously from POST /messages, see the module README. */
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Scripted keyword replies, not a real language model - see the module README. */
export default function AssistantWidget({ apiBaseUrl }: AssistantWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/ai/messages`)
      .then((response) => response.json())
      .then((data: ChatMessage[]) => setMessages(data))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !apiBaseUrl || sending) return;
    setSending(true);
    setDraft("");
    setMessages((current) => [
      ...current,
      { id: `pending-${Date.now()}`, role: "user", text, createdAt: new Date().toISOString() },
    ]);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/ai/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const reply: ChatMessage = await response.json();
      setMessages((current) => [...current, reply]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") void send();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            smart_toy
          </span>
        }
      >
        <CardTitle>Alex Assistant</CardTitle>
        <CardSubtitle>Scripted replies - not real AI yet</CardSubtitle>
      </CardHeader>

      <CardContent className="flex max-h-56 flex-col gap-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-caption text-text-secondary">Say hello to Alex.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-widget px-3 py-2 text-body ${
                message.role === "user"
                  ? "self-end bg-accent-primary text-text-primary"
                  : "self-start bg-surface-hover text-text-primary"
              }`}
            >
              {message.text}
            </div>
          ))
        )}
      </CardContent>

      <CardFooter className="justify-start gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Alex..."
          aria-label="Message Alex"
          className="flex-1"
        />
        <Button variant="secondary" onClick={() => void send()} disabled={sending}>
          Send
        </Button>
      </CardFooter>
    </Card>
  );
}
