import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_weather_state"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_module()


def test_reading_to_payload_includes_sunrise_and_sunset() -> None:
    """Regression coverage for the auto day/night theme feature
    (apps/web/src/core/useAutoTheme.ts), which reads these two fields
    off this exact payload."""
    reading = state.WeatherReading(
        condition="clear",
        icon="clear_day",
        temperature=20.0,
        high=25.0,
        low=15.0,
        location="Madrid",
        units="metric",
        sunrise="2026-07-24T06:45:00",
        sunset="2026-07-24T21:15:00",
    )
    payload = state.reading_to_payload(reading)
    assert payload["sunrise"] == "2026-07-24T06:45:00"
    assert payload["sunset"] == "2026-07-24T21:15:00"
