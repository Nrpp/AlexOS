import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardLoading, CardError, Button } from "@alexos/ui";

interface Question {
  category: string;
  question: string;
  choices: string[];
  correctAnswer: string;
}

export interface TriviaQuizWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real trivia via the Open Trivia Database - free, no API key. */
export default function TriviaQuizWidget({ apiBaseUrl }: TriviaQuizWidgetProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    setError(null);
    setSelected(null);
    fetch(`${apiBaseUrl}/api/v1/modules/trivia_quiz/question`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then((result: Question) => setQuestion(result))
      .catch(() => setError("Couldn't reach the trivia service."));
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            quiz
          </span>
        }
      >
        <CardTitle>Trivia quiz</CardTitle>
        {question ? <CardSubtitle>{question.category}</CardSubtitle> : null}
      </CardHeader>
      {error ? (
        <CardError message={error} onRetry={refresh} />
      ) : question === null ? (
        <CardLoading />
      ) : (
        <CardContent className="flex flex-col gap-3">
          <p className="text-body text-text-primary">{question.question}</p>
          <div className="flex flex-col gap-2">
            {question.choices.map((choice) => {
              const isCorrect = choice === question.correctAnswer;
              const isSelected = choice === selected;
              const revealed = selected !== null;
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setSelected(choice)}
                  disabled={revealed}
                  className={`rounded-button border px-3 py-2 text-left text-body transition-colors duration-base ease-out ${
                    revealed && isCorrect
                      ? "border-success bg-success/10 text-success"
                      : revealed && isSelected
                        ? "border-danger bg-danger/10 text-danger"
                        : "border-border text-text-primary"
                  }`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" onClick={refresh}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              refresh
            </span>
            Next question
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
