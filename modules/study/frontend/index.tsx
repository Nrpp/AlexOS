import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardContent,
  CardEmpty,
  CardLoading,
  CardFooter,
  Input,
  Button,
} from "@alexos/ui";

export interface PomodoroWidgetProps {
  /** Unused - this widget is fully client-side. */
  eventBus?: unknown;
  apiBaseUrl?: string;
}

type Phase = "work" | "break";

// Mirrors config.json's intended defaults - see the module README for
// why these are hardcoded rather than fetched.
const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

const PHASE_LABEL: Record<Phase, string> = { work: "Focus", break: "Break" };
const PHASE_SECONDS: Record<Phase, number> = {
  work: WORK_MINUTES * 60,
  break: BREAK_MINUTES * 60,
};

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/** Fully client-side - no backend, no external data, see the module README. */
export default function PomodoroWidget(_props: PomodoroWidgetProps) {
  const [phase, setPhase] = useState<Phase>("work");
  const [remainingSeconds, setRemainingSeconds] = useState(PHASE_SECONDS.work);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current > 1) return current - 1;
        setPhase((currentPhase) => (currentPhase === "work" ? "break" : "work"));
        return 0;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  // Once the countdown lands on 0, the phase has already flipped above -
  // load the new phase's duration on the next render.
  useEffect(() => {
    if (remainingSeconds === 0) {
      setRemainingSeconds(PHASE_SECONDS[phase]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const reset = () => {
    setRunning(false);
    setPhase("work");
    setRemainingSeconds(PHASE_SECONDS.work);
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            timer
          </span>
        }
      >
        <CardTitle>Pomodoro</CardTitle>
        <CardSubtitle>{PHASE_LABEL[phase]}</CardSubtitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <span className="text-display font-semibold tabular-nums text-text-primary">
          {formatCountdown(remainingSeconds)}
        </span>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => setRunning((current) => !current)}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              {running ? "pause" : "play_arrow"}
            </span>
            {running ? "Pause" : "Start"}
          </Button>
          <Button variant="ghost" onClick={reset}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              refresh
            </span>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export interface StudyWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCountdownLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days overdue`;
}

interface Exam {
  id: string;
  name: string;
  date: string;
}

/** Real, persisted exam countdown - stored server-side via the Core
 * Storage Manager, so it survives restarts (see modules/study/backend). */
export function ExamCountdownWidget({ apiBaseUrl }: StudyWidgetProps) {
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/study/exams`)
      .then((response) => response.json())
      .then((result: Exam[]) => setExams(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addExam = async () => {
    const trimmed = name.trim();
    if (!trimmed || !date || !apiBaseUrl) return;
    setName("");
    setDate("");
    await fetch(`${apiBaseUrl}/api/v1/modules/study/exams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, date }),
    });
    refresh();
  };

  const removeExam = async (examId: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/study/exams/${examId}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            event_upcoming
          </span>
        }
      >
        <CardTitle>Exam countdown</CardTitle>
      </CardHeader>

      {exams === null ? (
        <CardLoading />
      ) : exams.length === 0 ? (
        <CardEmpty icon="event_available" message="No exams scheduled." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {exams.map((exam) => {
              const days = daysUntil(exam.date);
              return (
                <li key={exam.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-body text-text-primary">{exam.name}</p>
                    <p
                      className={`text-caption ${days < 0 ? "text-danger" : days <= 3 ? "text-warning" : "text-text-secondary"}`}
                    >
                      {formatCountdownLabel(days)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeExam(exam.id)}
                    aria-label={`Remove ${exam.name}`}
                    className="text-text-secondary hover:text-danger"
                  >
                    <span className="material-symbols-rounded text-lg" aria-hidden>
                      close
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}

      <CardFooter className="flex-col items-stretch gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Exam name..."
          aria-label="New exam name"
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Exam date"
            className="flex-1"
          />
          <Button variant="secondary" onClick={() => void addExam()}>
            Add
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface HomeworkItem {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
}

/** Real, persisted homework tracker (see modules/study/backend). */
export function HomeworkWidget({ apiBaseUrl }: StudyWidgetProps) {
  const [items, setItems] = useState<HomeworkItem[] | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/study/homework`)
      .then((response) => response.json())
      .then((result: HomeworkItem[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addHomework = async () => {
    const trimmed = title.trim();
    if (!trimmed || !apiBaseUrl) return;
    setTitle("");
    setDueDate("");
    await fetch(`${apiBaseUrl}/api/v1/modules/study/homework`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed, dueDate: dueDate || null }),
    });
    refresh();
  };

  const toggleHomework = async (item: HomeworkItem) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/study/homework/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !item.completed }),
    });
    refresh();
  };

  const removeHomework = async (itemId: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/study/homework/${itemId}`, { method: "DELETE" });
    refresh();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") void addHomework();
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
        <CardTitle>Homework</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : items.length === 0 ? (
        <CardEmpty icon="assignment_turned_in" message="No homework pending." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void toggleHomework(item)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-base ease-out ${
                      item.completed
                        ? "border-success bg-success/20 text-success"
                        : "border-border text-transparent"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base" aria-hidden>
                      check
                    </span>
                  </span>
                  <span>
                    <span
                      className={`text-body block ${item.completed ? "text-text-secondary line-through" : "text-text-primary"}`}
                    >
                      {item.title}
                    </span>
                    {item.dueDate ? (
                      <span className="text-caption text-text-secondary">Due {item.dueDate}</span>
                    ) : null}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void removeHomework(item.id)}
                  aria-label={`Remove ${item.title}`}
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
          onKeyDown={handleKeyDown}
          placeholder="Homework title..."
          aria-label="New homework title"
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label="Due date (optional)"
            className="flex-1"
          />
          <Button variant="secondary" onClick={() => void addHomework()}>
            Add
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

/** A to-do list dedicated to the Study page - separate from the
 * Google-Tasks-backed `modules/tasks` used on Home/Communication,
 * since the user asked for one specific to Study. */
export function TodoWidget({ apiBaseUrl }: StudyWidgetProps) {
  const [todos, setTodos] = useState<TodoItem[] | null>(null);
  const [title, setTitle] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/study/todos`)
      .then((response) => response.json())
      .then((result: TodoItem[]) => setTodos(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTodo = async () => {
    const trimmed = title.trim();
    if (!trimmed || !apiBaseUrl) return;
    setTitle("");
    await fetch(`${apiBaseUrl}/api/v1/modules/study/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    refresh();
  };

  const toggleTodo = async (todo: TodoItem) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/study/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    refresh();
  };

  const removeTodo = async (todoId: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/study/todos/${todoId}`, { method: "DELETE" });
    refresh();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") void addTodo();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            checklist
          </span>
        }
      >
        <CardTitle>To-do</CardTitle>
      </CardHeader>

      {todos === null ? (
        <CardLoading />
      ) : todos.length === 0 ? (
        <CardEmpty icon="task_alt" message="Nothing on your study to-do list." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {todos.map((todo) => (
              <li key={todo.id} className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void toggleTodo(todo)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-base ease-out ${
                      todo.completed
                        ? "border-success bg-success/20 text-success"
                        : "border-border text-transparent"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base" aria-hidden>
                      check
                    </span>
                  </span>
                  <span
                    className={`text-body ${todo.completed ? "text-text-secondary line-through" : "text-text-primary"}`}
                  >
                    {todo.title}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void removeTodo(todo.id)}
                  aria-label={`Remove ${todo.title}`}
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

      <CardFooter className="gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a to-do..."
          aria-label="New to-do title"
          className="flex-1"
        />
        <Button variant="secondary" onClick={() => void addTodo()}>
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
