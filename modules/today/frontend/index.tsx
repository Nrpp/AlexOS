import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading } from "@alexos/ui";

interface Exam {
  id: string;
  name: string;
  date: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface TasksResponse {
  configured: boolean;
  tasks: Task[];
}

interface TodaySummary {
  exams: Exam[];
  assignments: Assignment[];
  tasks: Task[];
  tasksConfigured: boolean;
}

export interface TodayWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** No backend of its own - pulls live from modules/study,
 * modules/assignment_tracker and modules/tasks' existing REST
 * endpoints, exactly the way ModuleWidgetPage already composes several
 * modules' widgets onto one page, just merged into a single card
 * instead of stacked as three. One module failing to load (not
 * installed, not configured, network hiccup) doesn't block the
 * others - see loadSection below. */
export default function TodayWidget({ apiBaseUrl }: TodayWidgetProps) {
  const [summary, setSummary] = useState<TodaySummary | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;

    const loadSection = async <T,>(path: string, fallback: T): Promise<T> => {
      try {
        const response = await fetch(`${apiBaseUrl}${path}`);
        if (!response.ok) return fallback;
        return (await response.json()) as T;
      } catch {
        return fallback;
      }
    };

    Promise.all([
      loadSection<Exam[]>("/api/v1/modules/study/exams", []),
      loadSection<Assignment[]>("/api/v1/modules/assignment_tracker/items", []),
      loadSection<TasksResponse>("/api/v1/modules/tasks/tasks", { configured: false, tasks: [] }),
    ]).then(([exams, assignments, tasksResponse]) => {
      setSummary({
        exams: [...exams].sort((a, b) => a.date.localeCompare(b.date)),
        assignments: assignments.filter((a) => !a.done).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        tasks: tasksResponse.tasks.filter((t) => !t.completed),
        tasksConfigured: tasksResponse.configured,
      });
    });
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const nothingDue =
    summary !== null && summary.exams.length === 0 && summary.assignments.length === 0 && summary.tasks.length === 0;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            checklist
          </span>
        }
      >
        <CardTitle>Today</CardTitle>
      </CardHeader>

      {summary === null ? (
        <CardLoading />
      ) : nothingDue ? (
        <CardEmpty icon="checklist" message="Nothing due - exams, assignments and tasks are all clear." />
      ) : (
        <CardContent>
          <div className="flex flex-col gap-4">
            {summary.exams.length > 0 ? (
              <section>
                <h4 className="mb-1 text-caption font-semibold text-text-secondary">Exams</h4>
                <ul className="flex flex-col gap-1">
                  {summary.exams.map((exam) => (
                    <li key={exam.id} className="flex justify-between text-body">
                      <span className="text-text-primary">{exam.name}</span>
                      <span className="text-text-secondary">{exam.date}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {summary.assignments.length > 0 ? (
              <section>
                <h4 className="mb-1 text-caption font-semibold text-text-secondary">Assignments</h4>
                <ul className="flex flex-col gap-1">
                  {summary.assignments.map((assignment) => (
                    <li key={assignment.id} className="flex justify-between text-body">
                      <span className="text-text-primary">{assignment.title}</span>
                      <span className="text-text-secondary">{assignment.dueDate}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {summary.tasksConfigured && summary.tasks.length > 0 ? (
              <section>
                <h4 className="mb-1 text-caption font-semibold text-text-secondary">Tasks</h4>
                <ul className="flex flex-col gap-1">
                  {summary.tasks.map((task) => (
                    <li key={task.id} className="text-body text-text-primary">
                      {task.title}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
