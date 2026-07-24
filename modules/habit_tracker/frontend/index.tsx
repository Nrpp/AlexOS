import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface Habit {
  id: string;
  name: string;
  streak: number;
  lastCheckedDate: string | null;
}

export interface HabitTrackerWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function isCheckedToday(habit: Habit): boolean {
  return habit.lastCheckedDate === new Date().toISOString().slice(0, 10);
}

/** Real, persisted habit tracker with real streak counting based on
 * calendar dates (see modules/habit_tracker/backend/state.py). */
export default function HabitTrackerWidget({ apiBaseUrl }: HabitTrackerWidgetProps) {
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [name, setName] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/habit_tracker/habits`)
      .then((response) => response.json())
      .then((result: Habit[]) => setHabits(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addHabit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !apiBaseUrl) return;
    setName("");
    await fetch(`${apiBaseUrl}/api/v1/modules/habit_tracker/habits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    refresh();
  };

  const checkIn = async (habit: Habit) => {
    if (!apiBaseUrl || isCheckedToday(habit)) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/habit_tracker/habits/${habit.id}/check`, { method: "POST" });
    refresh();
  };

  const removeHabit = async (habitId: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/habit_tracker/habits/${habitId}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            task_alt
          </span>
        }
      >
        <CardTitle>Habit tracker</CardTitle>
      </CardHeader>

      {habits === null ? (
        <CardLoading />
      ) : habits.length === 0 ? (
        <CardEmpty icon="task_alt" message="No habits yet." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {habits.map((habit) => {
              const checkedToday = isCheckedToday(habit);
              return (
                <li key={habit.id} className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => void checkIn(habit)}
                    disabled={checkedToday}
                    className="flex flex-1 items-center gap-3 text-left disabled:cursor-default"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-base ease-out ${
                        checkedToday
                          ? "border-success bg-success/20 text-success"
                          : "border-border text-transparent hover:border-accent-primary"
                      }`}
                    >
                      <span className="material-symbols-rounded text-base" aria-hidden>
                        check
                      </span>
                    </span>
                    <span className="text-body text-text-primary">{habit.name}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex items-center gap-1 text-caption text-text-secondary">
                      <span className="material-symbols-rounded text-sm" aria-hidden>
                        local_fire_department
                      </span>
                      {habit.streak}
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeHabit(habit.id)}
                      aria-label={`Remove ${habit.name}`}
                      className="text-text-secondary hover:text-danger"
                    >
                      <span className="material-symbols-rounded text-lg" aria-hidden>
                        close
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}

      <CardFooter className="gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void addHabit()}
          placeholder="New habit..."
          aria-label="New habit name"
          className="flex-1"
        />
        <Button variant="secondary" onClick={() => void addHabit()}>
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
