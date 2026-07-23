"""Static expenses seeded from config.json. See the module README for
what a real bank connection would replace here."""

from __future__ import annotations

from typing import Any

_budget = 0.0
_expenses: list[dict[str, Any]] = []


def configure(config: dict[str, Any]) -> None:
    global _budget, _expenses
    _budget = config.get("monthlyBudget", 0)
    _expenses = config.get("expenses", [])


def summary() -> dict[str, Any]:
    total = sum(expense["amount"] for expense in _expenses)
    return {"budget": _budget, "total": total, "expenses": _expenses}
