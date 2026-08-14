import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from "@alexos/ui";

export interface TimesTablesPracticeWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

interface Question {
  a: number;
  b: number;
}

function randomFactor(): number {
  return Math.floor(Math.random() * 12) + 1;
}

function makeQuestion(): Question {
  return { a: randomFactor(), b: randomFactor() };
}

/** Fully client-side - random questions and a session score, no backend needed. */
export default function TimesTablesPracticeWidget(_props: TimesTablesPracticeWidgetProps) {
  const [question, setQuestion] = useState<Question>(() => makeQuestion());
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const submit = () => {
    const parsed = Number.parseInt(answer, 10);
    if (Number.isNaN(parsed)) return;
    const isCorrect = parsed === question.a * question.b;
    setFeedback(isCorrect ? "correct" : "incorrect");
    setTotalCount((current) => current + 1);
    if (isCorrect) setCorrectCount((current) => current + 1);
  };

  const next = () => {
    setQuestion(makeQuestion());
    setAnswer("");
    setFeedback(null);
  };

  const resetScore = () => {
    setCorrectCount(0);
    setTotalCount(0);
    next();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    if (feedback === null) submit();
    else next();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            grid_on
          </span>
        }
      >
        <CardTitle>Times tables practice</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-center text-heading font-semibold tabular-nums text-text-primary">
          {question.a} &times; {question.b} = ?
        </p>

        <Input
          type="number"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Your answer"
          aria-label="Your answer"
          disabled={feedback !== null}
        />

        {feedback === null ? (
          <Button variant="primary" onClick={submit}>
            Submit
          </Button>
        ) : (
          <>
            <p className={`text-center text-body ${feedback === "correct" ? "text-success" : "text-danger"}`}>
              {feedback === "correct" ? "Correct!" : `Incorrect - the answer was ${question.a * question.b}.`}
            </p>
            <Button variant="primary" onClick={next}>
              Next question
            </Button>
          </>
        )}

        <div className="flex items-center justify-between gap-3 rounded-button border border-border bg-background-secondary px-3 py-2">
          <span className="text-caption text-text-secondary">
            Score: {correctCount} / {totalCount}
          </span>
          <Button variant="ghost" onClick={resetScore} className="h-8 min-h-0 px-2 text-caption">
            Reset score
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
