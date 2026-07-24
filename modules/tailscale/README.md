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
