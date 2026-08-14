import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface StudyContact {
  id: string;
  name: string;
  subject: string;
  contactInfo: string;
}

export interface StudyContactsWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real, persisted study contacts (see modules/study_contacts/backend). */
export default function StudyContactsWidget({ apiBaseUrl }: StudyContactsWidgetProps) {
  const [items, setItems] = useState<StudyContact[] | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/study_contacts/items`)
      .then((response) => response.json())
      .then((result: StudyContact[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmedName = name.trim();
    const trimmedSubject = subject.trim();
    const trimmedContactInfo = contactInfo.trim();
    if (!trimmedName || !apiBaseUrl) return;
    setName("");
    setSubject("");
    setContactInfo("");
    await fetch(`${apiBaseUrl}/api/v1/modules/study_contacts/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName, subject: trimmedSubject, contactInfo: trimmedContactInfo }),
    });
    refresh();
  };

  const deleteItem = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/study_contacts/items/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            contacts
          </span>
        }
      >
        <CardTitle>Study contacts</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : items.length === 0 ? (
        <CardEmpty icon="contacts" message="No study contacts yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-text-primary">{item.name}</p>
                  <p className="truncate text-caption text-text-secondary">
                    {item.subject}
                    {item.contactInfo ? ` - ${item.contactInfo}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  aria-label={`Delete ${item.name}`}
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
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name..."
          aria-label="New contact name"
        />
        <div className="flex gap-2">
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Subject..."
            aria-label="Subject"
            className="flex-1"
          />
          <Input
            value={contactInfo}
            onChange={(event) => setContactInfo(event.target.value)}
            placeholder="Email/phone/handle..."
            aria-label="Contact info"
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
