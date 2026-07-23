# Bootstraps a local dev environment: env file, npm workspaces, Python venv.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
}

Write-Host "Installing frontend dependencies (npm workspaces)..."
npm install

Write-Host "Setting up the backend virtual environment..."
python -m venv apps/api/.venv
& "apps/api/.venv/Scripts/pip.exe" install --upgrade pip
& "apps/api/.venv/Scripts/pip.exe" install -r apps/api/requirements.txt

Write-Host "Setup complete. Run scripts/dev.ps1 to start both apps."
