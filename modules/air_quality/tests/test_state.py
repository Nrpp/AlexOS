import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_air_quality_state"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "state.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


state = _load_module()


def test_aqi_category_boundaries() -> None:
    assert state.aqi_category(0) == "Good"
    assert state.aqi_category(50) == "Good"
    assert state.aqi_category(51) == "Moderate"
    assert state.aqi_category(100) == "Moderate"
    assert state.aqi_category(101) == "Unhealthy for Sensitive Groups"
    assert state.aqi_category(151) == "Unhealthy"
    assert state.aqi_category(201) == "Very Unhealthy"
    assert state.aqi_category(301) == "Hazardous"


def test_aqi_category_unknown_when_none() -> None:
    assert state.aqi_category(None) == "Unknown"
