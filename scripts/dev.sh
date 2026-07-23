#!/usr/bin/env bash
# Runs the API and the web app together with hot reload. Ctrl+C stops both.
set -euo pipefail

cd "$(dirname "$0")/.."

cleanup() {
  jobs -p | xargs -r kill
}
trap cleanup EXIT

source apps/api/.venv/bin/activate
(cd apps/api && uvicorn app.main:app --reload --port 8000) &

npm run dev --workspace=apps/web &

wait
