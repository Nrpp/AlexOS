#!/usr/bin/env bash
# Bootstraps a local dev environment: env file, npm workspaces, Python venv.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo "Installing frontend dependencies (npm workspaces)..."
npm install

echo "Setting up the backend virtual environment..."
python3 -m venv apps/api/.venv
source apps/api/.venv/bin/activate
pip install --upgrade pip
pip install -r apps/api/requirements.txt

echo "Setup complete. Run ./scripts/dev.sh to start both apps."
