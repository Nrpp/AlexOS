import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardLoading } from "@alexos/ui";

interface Expense {
  category: string;
  amount: number;
}

interface FinanceSummary {
  budget: number;
  total: number;
  expenses: Expense[];
}

export interface FinanceWidgetProps {
  /** Unused - nothing pushes finance changes yet, see the module README. */
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Seeded from config.json for now - see the module README for what going real needs. */
export default function FinanceWidget({ apiBaseUrl }: FinanceWidgetProps) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/finance/expenses`)
      .then((response) => response.json())
      .then((data: FinanceSummary) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  const percent = summary && summary.budget > 0 ? Math.min(100, Math.round((summary.total / summary.budget) * 100)) : 0;
  const overBudget = summary ? summary.total > summary.budget : false;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            savings
          </span>
        }
      >
        <CardTitle>Finance</CardTitle>
        <CardSubtitle>This month</CardSubtitle>
      </CardHeader>
      {summary ? (
        <CardContent className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between text-caption text-text-secondary">
              <span>
                ${summary.total.toFixed(0)} of ${summary.budget.toFixed(0)}
              </span>
              <span>{percent}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-surface-hover">
              <div
                className={`h-2 rounded-full transition-all duration-base ease-out ${overBudget ? "bg-danger" : "bg-accent-primary"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {summary.expenses.map((expense) => (
              <li key={expense.category} className="flex items-center justify-between text-body">
                <span className="text-text-primary">{expense.category}</span>
                <span className="text-text-secondary">${expense.amount.toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : (
        <CardLoading />
      )}
    </Card>
  );
}
