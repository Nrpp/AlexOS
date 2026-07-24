import importlib.util
import sys
from datetime import date, timedelta
from pathlib import Path

_MODULE_NAME = "alexos_test_habit_tracker_state"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_module()


def test_first_check_in_starts_streak_at_one() -> None:
    habit = {"streak": 0, "lastCheckedDate": None}
    today = date(2026, 7, 24)
    result = state._apply_check_in(habit, today)
    assert result["streak"] == 1
    assert result["lastCheckedDate"] == "2026-07-24"


def test_consecutive_day_increments_streak() -> None:
    yesterday = date(2026, 7, 23)
    habit = {"streak": 5, "lastCheckedDate": yesterday.isoformat()}
    today = date(2026, 7, 24)
    result = state._apply_check_in(habit, today)
    assert result["streak"] == 6


def test_gap_of_two_days_resets_streak() -> None:
    two_days_ago = date(2026, 7, 22)
    habit = {"streak": 10, "lastCheckedDate": two_days_ago.isoformat()}
    today = date(2026, 7, 24)
    result = state._apply_check_in(habit, today)
    assert result["streak"] == 1


def test_checking_in_twice_same_day_is_a_no_op() -> None:
    today = date(2026, 7, 24)
    habit = {"streak": 3, "lastCheckedDate": today.isoformat()}
    result = state._apply_check_in(habit, today)
    assert result["streak"] == 3


def test_streak_math_uses_real_calendar_dates_across_month_boundary() -> None:
    last_day_of_month = date(2026, 6, 30)
    habit = {"streak": 7, "lastCheckedDate": last_day_of_month.isoformat()}
    first_day_of_next_month = date(2026, 7, 1)
    result = state._apply_check_in(habit, first_day_of_next_month)
    assert result["streak"] == 8
    assert (first_day_of_next_month - timedelta(days=1)) == last_day_of_month
