import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from "@alexos/ui";

export interface GpaWhatifWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

interface Course {
  id: string;
  name: string;
  credits: string;
  grade: string;
}

// Standard US 4.0 scale.
const GRADE_POINTS: Record<string, number> = {
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  D: 1.0,
  F: 0.0,
};

const GRADES = Object.keys(GRADE_POINTS);

let nextId = 1;
function createCourse(): Course {
  const id = String(nextId);
  nextId += 1;
  return { id, name: "", credits: "3", grade: "A" };
}

/** Ephemeral in-memory scratchpad - not persisted, resets on reload. */
export default function GpaWhatifWidget(_props: GpaWhatifWidgetProps) {
  const [courses, setCourses] = useState<Course[]>(() => [createCourse()]);

  const updateCourse = (id: string, patch: Partial<Course>) => {
    setCourses((current) => current.map((course) => (course.id === id ? { ...course, ...patch } : course)));
  };

  const addCourse = () => setCourses((current) => [...current, createCourse()]);
  const removeCourse = (id: string) => setCourses((current) => current.filter((course) => course.id !== id));

  const gpa = useMemo(() => {
    let totalPoints = 0;
    let totalCredits = 0;
    for (const course of courses) {
      const credits = Number.parseFloat(course.credits);
      const points = GRADE_POINTS[course.grade];
      if (Number.isNaN(credits) || credits <= 0 || points === undefined) continue;
      totalPoints += credits * points;
      totalCredits += credits;
    }
    if (totalCredits === 0) return null;
    return totalPoints / totalCredits;
  }, [courses]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            school
          </span>
        }
      >
        <CardTitle>GPA what-if</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-caption text-text-secondary">
          Scratchpad only - not saved. Add courses to see your live weighted GPA.
        </p>

        <div className="flex flex-col gap-2">
          {courses.map((course) => (
            <div key={course.id} className="flex items-center gap-2">
              <Input
                value={course.name}
                onChange={(event) => updateCourse(course.id, { name: event.target.value })}
                placeholder="Course name"
                aria-label="Course name"
                className="flex-[2]"
              />
              <Input
                type="number"
                value={course.credits}
                onChange={(event) => updateCourse(course.id, { credits: event.target.value })}
                aria-label="Credit hours"
                className="w-16"
                min={0}
              />
              <select
                value={course.grade}
                onChange={(event) => updateCourse(course.id, { grade: event.target.value })}
                aria-label="Letter grade"
                className="h-14 rounded-button border border-border bg-background-secondary px-2 text-body text-text-primary"
              >
                {GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeCourse(course.id)}
                aria-label="Remove course"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button border border-border text-text-secondary transition-colors duration-base ease-out hover:border-danger hover:text-danger"
              >
                <span className="material-symbols-rounded text-base" aria-hidden>
                  close
                </span>
              </button>
            </div>
          ))}
        </div>

        <Button variant="secondary" onClick={addCourse}>
          Add course
        </Button>

        <p className="text-center text-title font-semibold tabular-nums text-text-primary">
          GPA: {gpa !== null ? gpa.toFixed(2) : "-"}
        </p>
      </CardContent>
    </Card>
  );
}
