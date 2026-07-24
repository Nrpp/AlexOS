import importlib.util
import sys
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_MODULE_NAME = "alexos_test_calendar_state"
_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_state():
    # state.py imports `app.core.google_auth` - only importable once
    # apps/api is on sys.path, which isn't the case when pytest runs
    # from the repo root (testpaths = ["modules"], see pyproject.toml).
    api_root = str(_REPO_ROOT / "apps" / "api")
    if api_root not in sys.path:
        sys.path.insert(0, api_root)

    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _STATE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_state()


def test_invalid_timezone_raises_calendar_config_error() -> None:
    """Regression test: an unrecognized IANA timezone name (or a
    missing `tzdata` package - see apps/api/requirements.txt, the
    actual bug this guards against) used to surface as an unhandled
    500, which the frontend then silently treated the same as "Google
    Calendar isn't connected yet" - hiding the real problem."""
    with pytest.raises(state.CalendarConfigError):
        state._resolve_timezone("Not/ARealZone")


def test_valid_timezone_resolves_without_error() -> None:
    """Guards against solving the bug above by making the check too
    broad (e.g. also rejecting legitimate timezone names)."""
    from zoneinfo import ZoneInfo

    assert state._resolve_timezone("Europe/Madrid") == ZoneInfo("Europe/Madrid")
