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


# --- Month view: bounds and date formatting --------------------------------


def test_month_bounds_spans_the_whole_month() -> None:
    from zoneinfo import ZoneInfo

    tz = ZoneInfo("UTC")
    start, end = state._month_bounds(2026, 2, tz)
    assert start == "2026-02-01T00:00:00+00:00"
    assert end == "2026-03-01T00:00:00+00:00"  # first of the *next* month, exclusive upper bound


def test_month_bounds_handles_december_rolling_into_next_year() -> None:
    from zoneinfo import ZoneInfo

    tz = ZoneInfo("UTC")
    start, end = state._month_bounds(2026, 12, tz)
    assert start == "2026-12-01T00:00:00+00:00"
    assert end == "2027-01-01T00:00:00+00:00"


def test_format_event_date_for_a_timed_event_uses_the_configured_timezone() -> None:
    from zoneinfo import ZoneInfo

    tz = ZoneInfo("America/New_York")
    # 2026-01-15T02:30:00Z is still 2026-01-14 evening in New York - the
    # whole reason this converts rather than just slicing the UTC string.
    start = {"dateTime": "2026-01-15T02:30:00+00:00"}
    assert state._format_event_date(start, tz) == "2026-01-14"


def test_format_event_date_for_an_all_day_event_uses_the_date_field_as_is() -> None:
    from zoneinfo import ZoneInfo

    start = {"date": "2026-03-10"}
    assert state._format_event_date(start, ZoneInfo("UTC")) == "2026-03-10"
