"""Real network data: internal/public IP, gateway/internet latency, LAN
device discovery via the ARP table, and on-demand speed tests.

Device discovery and latency measurement are Linux-only (parses
`/proc/net/arp`, shells out to `ping` with Linux's `-c`/`-W` flags) -
that's what the Pi runs. On anything else (including this project's
Windows dev machine) these degrade to empty/`None` rather than
crashing - see `read_arp_table` and `measure_latency_ms`.
"""

from __future__ import annotations

import asyncio
import ipaddress
import re
import socket
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

_ARP_TABLE_PATH = Path("/proc/net/arp")
_PING_TIME_RE = re.compile(r"time[=<]([\d.]+)")
_PING_SWEEP_CONCURRENCY = 32


@dataclass
class Device:
    ip: str
    mac: str
    hostname: str | None


def device_to_payload(device: Device) -> dict[str, Any]:
    return {"ip": device.ip, "mac": device.mac, "hostname": device.hostname}


@dataclass
class SpeedTestResult:
    download_mbps: float
    upload_mbps: float
    ping_ms: float


def speed_test_to_payload(result: SpeedTestResult) -> dict[str, Any]:
    return {"downloadMbps": result.download_mbps, "uploadMbps": result.upload_mbps, "pingMs": result.ping_ms}


def get_internal_ip() -> str | None:
    """The host's own LAN-facing IP. No packets are actually sent - UDP
    `connect()` only resolves routing - so this works even offline, and
    works cross-platform (unlike the rest of this module)."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return None


async def fetch_public_ip() -> str | None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("https://api.ipify.org", params={"format": "json"})
            response.raise_for_status()
            return response.json().get("ip")
    except httpx.HTTPError:
        return None


async def measure_latency_ms(host: str = "1.1.1.1") -> float | None:
    """Real round-trip latency via one ICMP ping. Uses Linux `ping`
    syntax; on a platform where that syntax doesn't apply (e.g. this
    project's Windows dev machine), the regex simply finds no match
    and this returns None rather than raising."""
    try:
        process = await asyncio.create_subprocess_exec(
            "ping",
            "-c",
            "1",
            "-W",
            "2",
            host,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=5)
    except (OSError, asyncio.TimeoutError):
        return None
    match = _PING_TIME_RE.search(stdout.decode(errors="replace"))
    return float(match.group(1)) if match else None


def read_arp_table() -> list[Device]:
    """Devices the host already knows about (from a prior scan or
    ordinary LAN traffic) - instant, but entries go stale as devices
    leave the network. See scan_subnet to force a refresh."""
    if not _ARP_TABLE_PATH.exists():
        return []
    lines = _ARP_TABLE_PATH.read_text().splitlines()[1:]  # header row
    devices = []
    for line in lines:
        parts = line.split()
        if len(parts) < 4:
            continue
        ip, mac, flags = parts[0], parts[3], parts[2]
        if flags == "0x0" or mac == "00:00:00:00:00:00":
            continue  # incomplete ARP entry - not actually reachable
        devices.append(Device(ip=ip, mac=mac, hostname=None))
    return devices


async def _resolve_hostname(ip: str) -> str | None:
    loop = asyncio.get_running_loop()
    try:
        hostname, _aliases, _addrs = await asyncio.wait_for(
            loop.run_in_executor(None, socket.gethostbyaddr, ip), timeout=1.0
        )
        return hostname
    except (OSError, asyncio.TimeoutError):
        return None


async def list_devices_with_hostnames() -> list[Device]:
    devices = read_arp_table()
    hostnames = await asyncio.gather(*(_resolve_hostname(device.ip) for device in devices))
    return [Device(ip=device.ip, mac=device.mac, hostname=hostname) for device, hostname in zip(devices, hostnames)]


def _subnet_hosts(cidr: str) -> list[str]:
    return [str(host) for host in ipaddress.ip_network(cidr, strict=False).hosts()]


async def _ping_once(ip: str, semaphore: asyncio.Semaphore) -> None:
    async with semaphore:
        try:
            process = await asyncio.create_subprocess_exec(
                "ping",
                "-c",
                "1",
                "-W",
                "1",
                ip,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await asyncio.wait_for(process.wait(), timeout=2)
        except (OSError, asyncio.TimeoutError):
            pass  # best-effort - devices that don't respond just won't show up


async def scan_subnet(cidr_override: str | None) -> bool:
    """Pings every host in the local /24 (or `cidr_override`) to
    populate the ARP table. Returns False if there's no subnet to scan
    (no internal IP and no override) - devices that don't respond to
    ping (some phones sleep their Wi-Fi radio) won't show up even after
    this."""
    if cidr_override:
        hosts = _subnet_hosts(cidr_override)
    else:
        internal_ip = get_internal_ip()
        if internal_ip is None:
            return False
        hosts = _subnet_hosts(f"{internal_ip}/24")

    semaphore = asyncio.Semaphore(_PING_SWEEP_CONCURRENCY)
    await asyncio.gather(*(_ping_once(ip, semaphore) for ip in hosts))
    return True


async def run_speed_test() -> SpeedTestResult:
    """Blocking network I/O against speedtest.net's infrastructure -
    can take 30-60 seconds, so always call via asyncio.to_thread.
    Imports `speedtest` lazily so the rest of this module keeps working
    even if that package is missing or its own import fails."""
    import speedtest

    def _run() -> SpeedTestResult:
        client = speedtest.Speedtest()
        client.get_best_server()
        client.download()
        client.upload()
        results = client.results.dict()
        return SpeedTestResult(
            download_mbps=round(results["download"] / 1_000_000, 1),
            upload_mbps=round(results["upload"] / 1_000_000, 1),
            ping_ms=round(results["ping"], 1),
        )

    return await asyncio.to_thread(_run)


@dataclass
class NetworkStatus:
    internal_ip: str | None
    public_ip: str | None
    latency_ms: float | None
    devices_online: int
    last_speed_test: dict[str, Any] | None


def status_to_payload(status: NetworkStatus) -> dict[str, Any]:
    return {
        "internalIp": status.internal_ip,
        "publicIp": status.public_ip,
        "latencyMs": status.latency_ms,
        "devicesOnline": status.devices_online,
        "lastSpeedTest": status.last_speed_test,
    }


class NetworkProvider:
    def __init__(self) -> None:
        self.public_ip: str | None = None
        self.latency_ms: float | None = None
        self.subnet_cidr_override: str | None = None
        self.last_speed_test: SpeedTestResult | None = None

    def configure(self, config: dict[str, Any]) -> None:
        self.subnet_cidr_override = config.get("subnetCidr") or None

    async def refresh_latency(self) -> None:
        self.latency_ms = await measure_latency_ms()

    async def refresh_public_ip(self) -> None:
        self.public_ip = await fetch_public_ip()

    def status(self) -> NetworkStatus:
        return NetworkStatus(
            internal_ip=get_internal_ip(),
            public_ip=self.public_ip,
            latency_ms=self.latency_ms,
            devices_online=len(read_arp_table()),
            last_speed_test=speed_test_to_payload(self.last_speed_test) if self.last_speed_test else None,
        )


provider = NetworkProvider()
