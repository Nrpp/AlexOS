# Control Center

Powers the Settings page's "Control center" section: WiFi and
Bluetooth for the Raspberry Pi itself.

## What it does

- **WiFi** (`backend/wifi.py`, `WifiWidget` - default export): `GET
  /wifi/networks` (scan via `nmcli`), `POST /wifi/connect`
  (`{ssid, password?}`), `POST /wifi/disconnect`. Shows signal
  strength, lock icon for secured networks, and which network is
  currently in use.
- **Bluetooth** (`backend/bluetooth.py`, `BluetoothWidget` - named
  export): `GET /bluetooth/devices`, `POST /bluetooth/scan` (8 seconds,
  then stops), `POST /bluetooth/pair` (pairs, trusts, and connects in
  one action), `POST /bluetooth/remove` (forgets a paired device).

Both widgets render in Settings (`apps/web/src/pages/Settings/index.tsx`),
not on their own Dock page - see `apps/web/src/modules/registry.ts` for
how a module can expose more than one widget.

## Real host control, and the tradeoff that requires

WiFi and Bluetooth are host-level concerns (NetworkManager and BlueZ
run as system services, not inside this container), so making them
controllable from AlexOS needs:

1. `network-manager` and `bluez` installed in the `api` container's
   image (`apps/api/Dockerfile`/`Dockerfile.dev`) so `nmcli` and
   `bluetoothctl` exist to run.
2. The host's D-Bus **system** bus bind-mounted into the container
   (`/var/run/dbus/system_bus_socket`, in `docker/docker-compose.yml`
   and `.dev.yml`) - both tools talk to their respective services over
   D-Bus, not directly.

**This is a real security tradeoff, not a default to copy elsewhere
without thinking about it again**: the system D-Bus reaches many host
services beyond NetworkManager/BlueZ - the same category of tradeoff as
the Docker socket in `modules/servers`, acceptable here specifically
because AlexOS runs on a single-user personal device. Comment out the
`dbus/system_bus_socket` volume line in the compose file(s) if you'd
rather keep this module's features disabled; both widgets show a clear
"isn't available" state instead of erroring when the tools or the
D-Bus socket aren't reachable.

## Not verified against real hardware

This project's dev machine is Windows, which has neither `nmcli` nor
`bluetoothctl` - `is_available()` correctly (and was confirmed) returns
`False` here, so both widgets show their honest empty state, but the
actual scan/connect/pair/remove logic has only been verified by unit
test against canned command output (`tests/test_wifi.py`,
`tests/test_bluetooth.py`), not against a real WiFi adapter or
Bluetooth device. Treat this as needing a first real check on the
actual Raspberry Pi - in particular, `bluetoothctl pair/trust/connect`
as direct (non-interactive) subcommands needs BlueZ 5.48 or newer,
which Raspberry Pi OS ships but isn't guaranteed on every Linux distro.

## Not included (yet)

Reboot/shutdown were considered for a "control center" but weren't
built in this pass - they need the same kind of host-privilege
plumbing as above (typically a mounted PID namespace or a small
privileged helper) and weren't part of what was explicitly asked for
(WiFi, Bluetooth). Worth a deliberate follow-up, not a default to slip
in here.
