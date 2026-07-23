# Finance

Powers the Finance page's expenses card.

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/finance/expenses`
  returns the budget and expense list seeded in `config.json`, plus the
  computed total. No `on_load` background work - nothing changes on its
  own.
- **Frontend** (`frontend/index.tsx`): a `FinanceWidget` with a spent-vs-
  budget bar and a per-category breakdown.

## Seeded data, and why

Real expense tracking means a bank/card integration (e.g. Plaid) - real
credentials, definitely not wired up here. `config.json`'s `expenses`
stands in for that feed. Going real means replacing
`backend/state.py`'s static list with calls to a real provider; the
router and widget don't need to change, since they only ever see the
same `{ budget, total, expenses: [{ category, amount }] }` shape.

## Configuration

`config.json`:

- `monthlyBudget` - the budget the total is measured against.
- `expenses` - each entry is `{ "category": "...", "amount": number }`.
