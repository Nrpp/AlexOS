# Network

Powers the Network page's IP/latency/speed-test card and devices card.

## What it does

- **Backend** (`backend/`): `GET /status` (internal/public IP, internet
  latency, device count, last speed test), `GET /devices` (LAN devices
  from the ARP table, with best-effort reverse-DNS hostnames), `POST
  /scan` (actively pings the local `/24` to populate the ARP table
  before re-reading it), `POST /speedtest` (on-demand, via
  `speedtest-cli` - not on a schedule, since it costs real bandwidth
  every time it runs). `on_load(event_bus, config)` ticks every
  `config.json`'s `tickIntervalSeconds` (30s default) refreshing
  latency, and refreshes the public IP roughly every 10 ticks (~5 min -
  it rarely changes and the lookup is an external HTTP call).
- **Frontend** (`frontend/index.tsx`): a default-exported `NetworkWidget`
  (IPs, latency, last speed test result, "Run speed test" button) and a
  named-exported `NetworkDevicesWidget` (device list, "Scan network"
  button) - both render on the Network page (see
  `apps/web/src/modules/registry.ts` for how a module can expose more
  than one widget).

## Real data, and what's Linux-only

- **Internal IP** (`get_internal_ip`): a local socket trick (`connect()`
  on a UDP socket, no packets actually sent) - works cross-platform,
  including this project's Windows dev machine.
- **Public IP** (`fetch_public_ip`): one outbound HTTP call to
  `api.ipify.org` - works anywhere with internet access.
- **Internet latency** (`measure_latency_ms`): shells out to `ping`
  with Linux's `-c`/`-W` flags. On a non-Linux host this returns `None`
  rather than crashing (the regex just finds no match), but it won't
  produce a real reading outside Linux.
- **Device discovery** (`read_arp_table`, `scan_subnet`): parses
  `/proc/net/arp`, which doesn't exist outside Linux - the devices list
  is honestly empty on anything else. `scan_subnet` pings every host in
  the local `/24` (override via `config.json`'s `subnetCidr`) to
  populate the ARP table first; relies on `network_mode: host` already
  being enabled in `docker/docker-compose.yml` (added for `modules/media`'s
  Cast discovery) so the container actually sees the LAN.
- **Speed test** (`run_speed_test`): uses the `speedtest-cli` package
  (new dependency, see `apps/api/requirements.txt`) against Ookla's
  infrastructure. Blocking and slow (10-60s) - always called via
  `asyncio.to_thread`. Its own exception types aren't stable across
  versions, so the router catches broadly and returns a clean 503
  rather than a raw stack trace.

None of the Linux-only pieces could be exercised against a real LAN or
a real Raspberry Pi during development (this project's dev machine is
Windows) - they're verified by unit test (`tests/test_state.py`, ARP
parsing and graceful-fallback behavior) and by confirming the
cross-platform pieces (internal IP, public IP, speed test) work for
real here. Treat the Linux-only paths as needing a first real check on
the actual Pi.

## Per-device bandwidth usage - not feasible from here

A per-device "who's using the most bandwidth right now" breakdown was
considered and **isn't built**, because it isn't actually observable
from a Raspberry Pi acting as a regular device on the LAN (not the
network's gateway/router): traffic between the router and any other
device never transits the Pi, so there's nothing on this host to
measure it from. The only way to get this is the router's own
API/stats (e.g. a UniFi controller exposes per-client tx/rx byte
counters) - hardware-specific, and not something to build against
speculatively. If you want this, it needs your router's make/model so
the right integration can be scoped.

## Configuration

`config.json`:

- `tickIntervalSeconds` - how often latency is re-measured.
- `subnetCidr` - override the subnet `POST /scan` sweeps (e.g.
  `"192.168.1.0/24"`). Leave blank to auto-detect from the host's own
  internal IP, assuming a `/24` - true for the overwhelming majority of
  home LANs.
