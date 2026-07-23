# Runs the API and the web app together with hot reload. Ctrl+C stops both.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$api = Start-Process -FilePath "apps/api/.venv/Scripts/uvicorn.exe" `
  -ArgumentList "app.main:app", "--reload", "--port", "8000" `
  -WorkingDirectory "apps/api" -PassThru -NoNewWindow

$web = Start-Process -FilePath "npm" `
  -ArgumentList "run", "dev", "--workspace=apps/web" `
  -PassThru -NoNewWindow

try {
  Wait-Process -Id $api.Id, $web.Id
} finally {
  Stop-Process -Id $api.Id -ErrorAction SilentlyContinue
  Stop-Process -Id $web.Id -ErrorAction SilentlyContinue
}
