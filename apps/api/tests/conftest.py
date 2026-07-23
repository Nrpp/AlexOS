"""Points the test suite at its own SQLite file before `app.main` is
imported anywhere, so tests never touch a developer's local alexos.db."""

import os
from pathlib import Path

_TEST_DB_PATH = Path(__file__).parent / "test_alexos.db"
os.environ.setdefault("ALEXOS_DATABASE_URL", f"sqlite+aiosqlite:///{_TEST_DB_PATH}")
os.environ.setdefault("ALEXOS_CORS_ORIGINS", "http://localhost:5173")
