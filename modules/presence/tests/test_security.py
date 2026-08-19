"""Self-contained: security.py has no imports outside the stdlib, so it
loads directly without apps/api on sys.path (unlike state.py/router.py,
which need app.core.storage_manager - see test_state.py)."""

import importlib.util
import sys
from pathlib import Path

_MODULE_NAME = "alexos_test_presence_security"
_MODULE_PATH = Path(__file__).parent.parent / "backend" / "security.py"


def _load_module():
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


security = _load_module()


def test_generate_device_token_is_long_and_random() -> None:
    first = security.generate_device_token()
    second = security.generate_device_token()
    assert first != second
    assert len(first) >= 32


def test_generate_device_id_slugifies_the_name() -> None:
    device_id = security.generate_device_id("Lucas's iPhone!")
    assert device_id.startswith("lucas-s-iphone")
    # A random suffix keeps two devices with the same name from colliding.
    assert device_id != security.generate_device_id("Lucas's iPhone!")


def test_generate_device_id_falls_back_when_name_has_no_alnum_chars() -> None:
    device_id = security.generate_device_id("!!!")
    assert device_id.startswith("device-")


def test_hash_pin_never_stores_the_plaintext_pin() -> None:
    record = security.hash_pin("1234")
    assert "1234" not in record.values()
    assert set(record.keys()) == {"hash", "salt", "iterations"}


def test_verify_pin_accepts_the_correct_pin() -> None:
    record = security.hash_pin("4242")
    assert security.verify_pin("4242", record) is True


def test_verify_pin_rejects_the_wrong_pin() -> None:
    record = security.hash_pin("4242")
    assert security.verify_pin("0000", record) is False


def test_verify_pin_handles_a_malformed_record_without_raising() -> None:
    assert security.verify_pin("4242", {}) is False


def test_hash_pin_uses_a_fresh_salt_each_time() -> None:
    first = security.hash_pin("1234")
    second = security.hash_pin("1234")
    assert first["salt"] != second["salt"]
    assert first["hash"] != second["hash"]


def test_tokens_match_compares_equal_and_unequal_tokens() -> None:
    assert security.tokens_match("abc", "abc") is True
    assert security.tokens_match("abc", "xyz") is False
