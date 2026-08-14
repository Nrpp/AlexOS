import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface Course {
  id: string;
  name: string;
  professor: string;
  credits: number;
}

export interface CourseListWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real, persisted course list (see modules/course_list/backend). */
export default function CourseListWidget({ apiBaseUrl }: CourseListWidgetProps) {
  const [items, setItems] = useState<Course[] | null>(null);
  const [name, setName] = useState("");
  const [professor, setProfessor] = useState("");
  const [credits, setCredits] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/course_list/items`)
      .then((response) => response.json())
      .then((result: Course[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmedName = name.trim();
    const trimmedProfessor = professor.trim();
    const creditsValue = Number(credits);
    if (!trimmedName || !apiBaseUrl || Number.isNaN(creditsValue)) return;
    setName("");
    setProfessor("");
    setCredits("");
    await fetch(`${apiBaseUrl}/api/v1/modules/course_list/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName, professor: trimmedProfessor, credits: creditsValue }),
    });
    refresh();
  };

  const deleteItem = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/course_list/items/${id}`, { method: "DELETE" });
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
        <CardTitle>Course list</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : items.length === 0 ? (
        <CardEmpty icon="menu_book" message="No courses added yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-text-primary">{item.name}</p>
                  <p className="text-caption text-text-secondary">
                    {item.professor} - {item.credits} credits
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
          placeholder="Course name..."
          aria-label="New course name"
        />
        <div className="flex gap-2">
          <Input
            value={professor}
            onChange={(event) => setProfessor(event.target.value)}
            placeholder="Professor..."
            aria-label="Professor"
            className="flex-1"
          />
          <Input
            type="number"
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
            placeholder="Credits"
            aria-label="Credits"
            className="w-28"
          />
          <Button variant="secondary" onClick={() => void addItem()}>
            Add
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
