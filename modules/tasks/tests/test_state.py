import importlib.util
import sys
from pathlib import Path

_STATE_PATH = Path(__file__).parent.parent / "backend" / "state.py"
_MODULE_NAME = "alexos_test_tasks_state"
_spec = importlib.util.spec_from_file_location(_MODULE_NAME, _STATE_PATH)
assert _spec is not None and _spec.loader is not None
state = importlib.util.module_from_spec(_spec)
# @dataclass looks itself up via sys.modules[cls.__module__] - must be
# registered before exec_module runs the class body.
sys.modules[_MODULE_NAME] = state
_spec.loader.exec_module(state)


def test_create_and_list_orders_incomplete_first() -> None:
    first = state.create_task("Write tests")
    second = state.create_task("Ship it")
    state.set_completed(first.id, True)

    ordered = state.list_tasks()

    assert ordered[0].id == second.id
    assert ordered[0].completed is False
    assert ordered[-1].id == first.id
    assert ordered[-1].completed is True


def test_set_completed_returns_none_for_unknown_task() -> None:
    assert state.set_completed("does-not-exist", True) is None
