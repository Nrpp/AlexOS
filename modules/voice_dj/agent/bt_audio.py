"""Bluetooth connect + PipeWire audio routing for the voice_dj agent.

Runs on the HOST (not in the Docker api container), so it can talk to
the real `bluetoothctl` and `pactl`/PipeWire that own the Pi's audio.

The pair/trust/connect helpers mirror
modules/control_center/backend/bluetooth.py (same bluetoothctl non-
interactive subcommands); we can't import that module here because it
lives inside the containerised backend and this is a standalone host
process, but the behaviour is intentionally the same.

THE CLASSIC-BLUETOOTH GOTCHA this file exists to handle:
a classic BT headset/speaker can't do hi-fi A2DP output and the
Hands-Free (HFP) microphone at the same time - the card exposes them as
two *mutually exclusive* PipeWire profiles. So the flow is explicit:

    profile = headset  -> the mic works (we can hear "Alex, pon musica")
    profile = a2dp     -> hi-fi music out, but NO mic

`use_mic_profile()` and `use_music_profile()` switch between the two, and
the main loop only ever listens in the mic profile and only ever plays
in the a2dp profile."""

from __future__ import annotations

import logging
import re
import subprocess
import time

log = logging.getLogger("voice_dj.bt_audio")


def _run(args: list[str], timeout: float = 15.0) -> tuple[int, str, str]:
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout, p.stderr
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        return 1, "", str(exc)


# --- bluetoothctl: pair / trust / connect ---------------------------------


def find_address_by_name(name_match: str) -> str | None:
    """Looks through known (and freshly scanned) devices for one whose
    name contains `name_match` (case-insensitive), e.g. "sound flow"."""
    name_match = name_match.lower()
    _run(["bluetoothctl", "--timeout", "8", "scan", "on"], timeout=12)
    rc, out, _ = _run(["bluetoothctl", "devices"])
    for line in out.splitlines():
        m = re.match(r"Device\s+([0-9A-Fa-f:]{17})\s+(.*)", line.strip())
        if m and name_match in m.group(2).lower():
            return m.group(1)
    return None


def is_connected(address: str) -> bool:
    rc, out, _ = _run(["bluetoothctl", "info", address])
    return "Connected: yes" in out


def ensure_connected(address: str, attempts: int = 3) -> bool:
    """Pair (if needed), trust, and connect the speaker. Trust matters so
    BlueZ lets it reconnect on its own after a drop."""
    if is_connected(address):
        return True
    _run(["bluetoothctl", "pair", address])
    _run(["bluetoothctl", "trust", address])
    for i in range(attempts):
        rc, out, err = _run(["bluetoothctl", "connect", address], timeout=20)
        if is_connected(address):
            return True
        log.warning("connect attempt %d failed: %s", i + 1, (err or out).strip())
        time.sleep(2)
    return is_connected(address)


# --- pactl: card profiles, sinks, sources ---------------------------------


def _mac_matches(address: str, node_name: str) -> bool:
    """A BT device's MAC shows up in PipeWire node names inconsistently:
    the sink/card use underscores (bluez_output.EC_ED_..._CC) while the
    HFP source can use colons (bluez_input.EC:ED:...:CC). Match any form,
    case-insensitively, so we find the mic as reliably as the speaker."""
    upper = address.upper()
    forms = {upper, upper.replace(":", "_"), upper.replace(":", "")}
    name = node_name.upper()
    return any(form in name for form in forms)


def _card_name(address: str) -> str | None:
    """PipeWire names a BT card `bluez_card.AA_BB_CC_DD_EE_FF`."""
    rc, out, _ = _run(["pactl", "list", "cards", "short"])
    for line in out.splitlines():
        fields = line.split("\t")
        if len(fields) >= 2 and _mac_matches(address, fields[1]):
            return fields[1]
    return None


def _available_profiles(card: str) -> list[str]:
    """Profile names from `pactl list cards` that are currently
    available (not `not available`) for `card`."""
    rc, out, _ = _run(["pactl", "list", "cards"])
    profiles: list[str] = []
    in_card = False
    in_profiles = False
    for line in out.splitlines():
        stripped = line.strip()
        if stripped.startswith("Name:"):
            in_card = stripped.split("Name:", 1)[1].strip() == card
            in_profiles = False
        if not in_card:
            continue
        if stripped.startswith("Profiles:"):
            in_profiles = True
            continue
        if in_profiles:
            m = re.match(r"([\w\-\+\.]+):\s.*\(.*available:\s*(\w+)", stripped)
            if m:
                if m.group(2).lower() != "no":
                    profiles.append(m.group(1))
            elif stripped and not line.startswith("\t\t"):
                in_profiles = False
    return profiles


def _pick_music_profile(profiles: list[str]) -> str | None:
    # Prefer a high-quality A2DP sink; codec suffix varies (sbc/aac/...).
    for want in ("a2dp-sink-aac", "a2dp-sink-sbc_xq", "a2dp-sink-sbc", "a2dp-sink"):
        for p in profiles:
            if p == want:
                return p
    for p in profiles:
        if p.startswith("a2dp-sink"):
            return p
    return None


def _pick_mic_profile(profiles: list[str]) -> str | None:
    # HFP head-unit carries the mic. mSBC (wideband) sounds better than
    # CVSD, but any head-unit profile gives us a usable mic.
    for want in ("headset-head-unit-msbc", "headset-head-unit-cvsd", "headset-head-unit"):
        for p in profiles:
            if p == want:
                return p
    for p in profiles:
        if "headset" in p or "handsfree" in p or "hfp" in p:
            return p
    return None


def _set_profile(card: str, profile: str) -> bool:
    rc, out, err = _run(["pactl", "set-card-profile", card, profile])
    if rc != 0:
        log.warning("set-card-profile %s %s failed: %s", card, profile, err.strip())
    return rc == 0


def _node_for(address: str, kind: str) -> str | None:
    """`kind` is "sinks" or "sources". Returns the bluez node name for
    this device, e.g. bluez_output.AA_BB_... / bluez_input.AA_BB_..."""
    rc, out, _ = _run(["pactl", "list", kind, "short"])
    for line in out.splitlines():
        fields = line.split("\t")
        if len(fields) >= 2 and _mac_matches(address, fields[1]):
            return fields[1]
    return None


def use_music_profile(address: str) -> tuple[bool, str]:
    """Switch the speaker to A2DP and make it the default output sink so
    whatever plays (ffplay/cvlc for radio, Chromium for Spotify) comes
    out of it. No mic in this profile - that's the hardware limit."""
    card = _card_name(address)
    if not card:
        return False, "speaker card not found in PipeWire (is it connected?)"
    profile = _pick_music_profile(_available_profiles(card))
    if not profile:
        return False, "no A2DP profile available on the speaker"
    _set_profile(card, profile)
    for _ in range(10):  # the sink appears a moment after the switch
        sink = _node_for(address, "sinks")
        if sink:
            _run(["pactl", "set-default-sink", sink])
            return True, sink
        time.sleep(0.5)
    return False, "A2DP sink didn't appear after the profile switch"


def use_mic_profile(address: str) -> tuple[bool, str]:
    """Switch the speaker to HFP so its microphone becomes a PipeWire
    source, and make it the default input. Audio out drops to mono
    phone-quality while in this profile - we're only here to listen."""
    card = _card_name(address)
    if not card:
        return False, "speaker card not found in PipeWire (is it connected?)"
    profile = _pick_mic_profile(_available_profiles(card))
    if not profile:
        return False, "no HFP/headset (mic) profile available on the speaker"
    _set_profile(card, profile)
    for _ in range(10):
        source = _node_for(address, "sources")
        if source:
            _run(["pactl", "set-default-source", source])
            return True, source
        time.sleep(0.5)
    return False, "HFP mic source didn't appear after the profile switch"


def mic_source_name(address: str) -> str | None:
    return _node_for(address, "sources")
