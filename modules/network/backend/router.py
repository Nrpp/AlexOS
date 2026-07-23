from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from .state import (
    device_to_payload,
    list_devices_with_hostnames,
    provider,
    run_speed_test,
    scan_subnet,
    speed_test_to_payload,
    status_to_payload,
)

router = APIRouter()


@router.get("/status")
async def get_status() -> dict:
    return status_to_payload(provider.status())


@router.get("/devices")
async def get_devices() -> list[dict]:
    devices = await list_devices_with_hostnames()
    return [device_to_payload(device) for device in devices]


@router.post("/scan")
async def post_scan(request: Request) -> list[dict]:
    scanned = await scan_subnet(provider.subnet_cidr_override)
    if not scanned:
        raise HTTPException(status_code=503, detail="Couldn't determine the local subnet to scan.")
    devices = await list_devices_with_hostnames()
    await request.app.state.event_bus.publish(
        "network.updated", status_to_payload(provider.status()), source="network", retain=True
    )
    return [device_to_payload(device) for device in devices]


@router.post("/speedtest")
async def post_speed_test(request: Request) -> dict:
    try:
        result = await run_speed_test()
    except Exception as error:
        # speedtest-cli's own exception types aren't stable across
        # versions and Ookla's infra is entirely outside our control -
        # any failure here should surface as a clean 503, not a 500.
        raise HTTPException(
            status_code=503, detail="Couldn't run the speed test - check internet connectivity."
        ) from error
    provider.last_speed_test = result
    payload = speed_test_to_payload(result)
    await request.app.state.event_bus.publish("network.speedtest_completed", payload, source="network")
    return payload
