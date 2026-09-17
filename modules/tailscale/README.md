# Tailscale

Powers the Network page's Tailscale status card: this device and its
Tailscale peers, online/offline.

## What it does

- **Backend** (`backend/state.py`): runs `tailscale status --json`
  (the `tailscale` CLI talking to the host's `tailscaled` over its
  local control socket) and parses the result. `on_load` ticks every
  `config.json`'s `tickIntervalSeconds` (30s default) and publishes
  `tailscale.updated` (retained), so a peer coming online/offline shows
  up without a manual page reload - same reasoning as `modules/network`.
- **Frontend** (`frontend/index.tsx`): a `TailscaleWidget` listing this
  device and each peer with an online/offline dot and its Tailscale IP.
  Rendered on the Network page alongside `modules/network`'s widgets
  (see `apps/web/src/pages/Network/index.tsx`).

## Real host integration, and the tradeoff that requires

Tailscale runs as a system service on the Pi itself (`tailscaled`), not
inside this container, so talking to it needs:

1. The `tailscale` CLI installed in the `api` container's image
   (`apps/api/Dockerfile`/`Dockerfile.dev`, via Tailscale's own apt repo).
2. The host's Tailscale control socket bind-mounted in
   (`/var/run/tailscale/tailscaled.sock`, in `docker/docker-compose.yml`
   and `.dev.yml`).

This is a **narrower** tradeoff than the Docker socket
(`modules/servers`) or the D-Bus socket (`modules/control_center`) -
this socket only exposes Tailscale's own status/control, not broad
host access - but it's still real host integration, not a default to
copy elsewhere without thinking about it again. Comment out the
`tailscaled.sock` volume line if you don't run Tailscale on this Pi;
the widget shows a clear "not available" state instead of erroring.

## Troubleshooting: running Pi-hole on the same Pi

Tailscale and Pi-hole both want to be the Pi's DNS answer, which is
where the conflict comes from - it isn't an AlexOS bug, it's the two
services fighting over the same job:

- **MagicDNS/`--accept-dns`.** By default, `tailscaled` rewrites the
  Pi's DNS resolution (via `systemd-resolved`) to point at Tailscale's
  own resolver (`100.100.100.100`), so tailnet hostnames resolve. If
  Pi-hole is also meant to be this Pi's resolver, the two collide - the
  fix is to turn Tailscale's DNS override off on this Pi specifically:
  ```bash
  sudo tailscale set --accept-dns=false
  ```
  This only stops `tailscaled` from managing *this device's own* DNS
  resolution - the tailnet connection itself (reaching other devices,
  `modules/presence`'s webhook exposure via `tailscale serve`/`funnel`,
  etc.) is unaffected.
- **`systemd-resolved`'s stub listener.** Raspberry Pi OS's default
  `systemd-resolved` binds `127.0.0.53:53` itself. Pi-hole's own
  install docs already have you disable this
  (`DNSStubListener=no` in `/etc/systemd/resolved.conf`, then
  `sudo systemctl restart systemd-resolved`) - if Tailscale's DNS
  override was re-enabling/fighting this, `--accept-dns=false` above
  should resolve it too.
- **Port 80** was a separate, unrelated collision some owners used to
  hit at the same time (Pi-hole's own web admin also listens there) -
  AlexOS's `web` service now defaults to port 8090 instead specifically
  to avoid it, see `docs/INSTALL_RPI5.md`'s Troubleshooting section.
- **Want tailnet devices to use Pi-hole for DNS too** (e.g. so a phone
  reaching AlexOS over Tailscale also gets ad-blocking)? Don't do that
  by leaving `--accept-dns` on here - add Pi-hole's Tailscale IP as a
  **Global nameserver** in the
  [Tailscale admin console's DNS settings](https://login.tailscale.com/admin/dns)
  instead. Setting it on the Pi-hole host itself would create a loop
  (this device asking Tailscale's resolver, which is configured to
  forward back to Pi-hole, which is this device).

## Verification status

This project's dev machine turned out to have the Tailscale Windows
client installed, so `is_available()` found a real `tailscale` CLI and
`GET /status` returned genuine (if logged-out) data - `{"available":
true, "backendState": "NoState", "self": {"hostname": "DESKTOP-...",
"ip": null, "online": false, "os": "windows"}, "peers": []}` - proving
the CLI invocation and JSON parsing both work against a real binary,
not just canned test fixtures. What's **not** verified: an actual
logged-in tailnet with online peers (this machine's Tailscale was never
connected), and the Linux-container path specifically - bind-mounting
the Pi's `tailscaled.sock` into the `api` container per the compose
files above. Treat that container-specific path as needing a first
real check on the actual Raspberry Pi.
