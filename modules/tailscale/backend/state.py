"""Real Tailscale network status via the `tailscale` CLI talking to the
host's `tailscaled` over its local control socket (bind-mounted - see
docker-compose.yml's comment). A narrower host-integration tradeoff
than the Docker socket (modules/servers) or D-Bus (modules/control_center)
- this socket only exposes Tailscale's own status/control, nothing
else on the host. Gracefully reports "unavailable" (not a crash) if
the CLI isn't installed or `tailscaled` isn't reachable - always true
on this project's Windows dev machine."""

from __future__ import annotations

import asyncio
import json
import shutil
from dataclasses import dataclass
from typing import Any


def is_available() -> bool:
    return shutil.which("tailscale") is not None


@dataclass
class TailscaleNode:
    hostname: str
    ip: str | None
    online: bool
    os: str


def node_to_payload(node: TailscaleNode) -> dict[str, Any]:
    return {"hostname": node.hostname, "ip": node.ip, "online": node.online, "os": node.os}


def _node_from_entry(entry: dict[str, Any]) -> TailscaleNode:
    ips = entry.get("TailscaleIPs") or []
    return TailscaleNode(
        hostname=entry.get("HostName", "unknown"),
        ip=ips[0] if ips else None,
        online=bool(entry.get("Online", False)),
        os=entry.get("OS", ""),
    )


def parse_status(raw_json: str) -> dict[str, Any]:
    data = json.loads(raw_json)
    self_entry = data.get("Self")
    peers_by_key = data.get("Peer") or {}
    peers = [_node_from_entry(entry) for entry in peers_by_key.values()]
    peers.sort(key=lambda node: node.hostname)
    return {
        "backendState": data.get("BackendState", "Unknown"),
        "self": node_to_payload(_node_from_entry(self_entry)) if self_entry else None,
        "peers": [node_to_payload(peer) for peer in peers],
    }


async def get_status() -> dict[str, Any] | None:
    """None means the CLI isn't installed or tailscaled isn't reachable -
    distinct from a real but empty/logged-out status."""
    if not is_available():
        return None
    process = await asyncio.create_subprocess_exec(
        "tailscale", "status", "--json", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, _stderr = await process.communicate()
    if process.returncode != 0:
        return None
    try:
        return parse_status(stdout.decode(errors="replace"))
    except json.JSONDecodeError:
        return None
