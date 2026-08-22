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
- **Bluetooth speaker** (`backend/bluetooth.py`,
  `BluetoothSpeakerWidget` - named export): `GET
  /bluetooth/speaker/status` (adapter powered/discoverable/pairable +
  every known device, each flagged `audioCapable` if it advertises the
  A2DP Audio Sink profile), `POST /bluetooth/speaker/mode`
  (`{enabled}` - toggles discoverable+pairable so a phone can find and
  pair with the Pi as a speaker). **This widget only controls whether
  new phones can find/pair with the Pi - it does not route any audio
  by itself.** See "Bluetooth speaker" below for the one-time OS setup
  that actually turns received audio into sound.

All three widgets render in Settings
(`apps/web/src/pages/Settings/index.tsx`), not on their own Dock page -
see `apps/web/src/modules/registry.ts` for how a module can expose
more than one widget.

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

## Bluetooth speaker

Turns the Pi into something a phone can play music through, like any
other Bluetooth speaker. Two separate halves:

1. **Discoverability** - the `BluetoothSpeakerWidget` toggle in
   Settings, covered above. Runs inside this container, over the same
   D-Bus bind-mount as the rest of this module.
2. **Actually turning received Bluetooth audio into sound** - a
   one-time setup on the Pi's host OS, outside anything a containerized
   API can configure (there's no audio device or audio server bind-
   mounted into the `api` container, deliberately - see "Real host
   control" above for why this module already keeps its host-privilege
   surface as narrow as it can). This is the part below.

**Not verified on real hardware** - written from Raspberry Pi OS's
current (Bookworm) documented approach, PipeWire replacing PulseAudio
as the default audio server. Treat it as a well-reasoned starting
point to try on the actual Pi, not a guarantee - see the
"Not verified against real hardware" section below for the general
caveat this whole module carries.

### Setup, on the Pi itself (not in this repo, not in a container)

```bash
sudo apt update
sudo apt install -y pipewire pipewire-audio-client-libraries pipewire-pulse \
  wireplumber libspa-0.2-bluetooth bluez-tools

# PipeWire normally runs as a per-user systemd service tied to a login
# session - "enable-linger" keeps it running for the pi user even
# headless, with nobody ever logging into a desktop session.
sudo loginctl enable-linger "$USER"
systemctl --user enable --now pipewire pipewire-pulse wireplumber
```

Make the adapter's name recognizable when pairing (optional, but
"raspberrypi" isn't very speaker-like):

```bash
sudo bluetoothctl system-alias "Alex Speaker"
```

**Auto-accept pairing without a prompt.** A2DP pairing is normally
"Just Works" (no PIN), but BlueZ still needs *something* acting as the
pairing agent to confirm it, and there's no one at a headless Pi to
click "yes". `bluez-tools` (installed above) ships `bt-agent` for
exactly this - run it as a systemd service so it's always there:

```bash
sudo tee /etc/systemd/system/bt-agent.service > /dev/null <<'EOF'
[Unit]
Description=Bluetooth auto-pairing agent
After=bluetooth.service
Requires=bluetooth.service

[Service]
ExecStart=/usr/bin/bt-agent --capability=NoInputNoOutput
Type=simple
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now bt-agent.service
```

### Using it

1. In AlexOS Settings, toggle **Bluetooth speaker** -> Discoverable as
   a speaker on.
2. On the phone: Bluetooth settings -> pair with the Pi's name (set
   above).
3. Play music. It should route through PipeWire to whatever the Pi's
   default audio output is (headphone jack, HDMI, or a USB DAC).

If nothing plays but pairing succeeds: check PipeWire actually claimed
the Bluetooth audio sink (`wpctl status` should list a Bluetooth sink
under Sinks) and that it's the *default* sink
(`wpctl set-default <id>` if not). If pairing itself fails or times
out, check `bt-agent.service`'s status
(`systemctl status bt-agent.service`) and that `Discoverable`/
`Pairable` are actually on (`bluetoothctl show`, or the widget's own
"discoverable"/"pairable" status).

## Not verified against real hardware

This project's dev machine is Windows, which has neither `nmcli` nor
`bluetoothctl` - `is_available()` correctly (and was confirmed) returns
`False` here, so all three widgets show their honest empty state, but
the actual scan/connect/pair/remove/power/discoverable/pairable logic
has only been verified by unit test against canned command output
(`tests/test_wifi.py`, `tests/test_bluetooth.py`), not against a real
WiFi adapter or Bluetooth device. Treat this as needing a first real
check on the actual Raspberry Pi - in particular, `bluetoothctl
pair/trust/connect/power/discoverable/pairable/show` as direct
(non-interactive) subcommands needs BlueZ 5.48 or newer, which
Raspberry Pi OS ships but isn't guaranteed on every Linux distro. The
"Bluetooth speaker" OS-level audio setup above (PipeWire, `bt-agent`)
is additionally unverified in its own right - see that section's own
note.

## Not included (yet)

Reboot/shutdown were considered for a "control center" but weren't
built in this pass - they need the same kind of host-privilege
plumbing as above (typically a mounted PID namespace or a small
privileged helper) and weren't part of what was explicitly asked for
(WiFi, Bluetooth). Worth a deliberate follow-up, not a default to slip
in here.
