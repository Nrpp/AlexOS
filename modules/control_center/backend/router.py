from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from .bluetooth import device_to_payload as bluetooth_device_to_payload
from .bluetooth import list_devices as bluetooth_list_devices
from .bluetooth import pair as bluetooth_pair
from .bluetooth import remove as bluetooth_remove
from .bluetooth import scan as bluetooth_scan
from .wifi import connect as wifi_connect
from .wifi import disconnect as wifi_disconnect
from .wifi import list_networks as wifi_list_networks
from .wifi import network_to_payload

router = APIRouter()


@router.get("/wifi/networks")
async def get_wifi_networks() -> dict:
    networks = await wifi_list_networks()
    if networks is None:
        return {"available": False, "networks": []}
    return {"available": True, "networks": [network_to_payload(network) for network in networks]}


class WifiConnectRequest(BaseModel):
    ssid: str
    password: str | None = None


@router.post("/wifi/connect")
async def post_wifi_connect(body: WifiConnectRequest) -> dict:
    ok, message = await wifi_connect(body.ssid, body.password)
    return {"ok": ok, "message": message}


@router.post("/wifi/disconnect")
async def post_wifi_disconnect() -> dict:
    ok, message = await wifi_disconnect()
    return {"ok": ok, "message": message}


@router.get("/bluetooth/devices")
async def get_bluetooth_devices() -> dict:
    devices = await bluetooth_list_devices()
    if devices is None:
        return {"available": False, "devices": []}
    return {"available": True, "devices": [bluetooth_device_to_payload(device) for device in devices]}


@router.post("/bluetooth/scan")
async def post_bluetooth_scan() -> dict:
    ok = await bluetooth_scan()
    return {"ok": ok}


class BluetoothAddressRequest(BaseModel):
    address: str


@router.post("/bluetooth/pair")
async def post_bluetooth_pair(body: BluetoothAddressRequest) -> dict:
    ok, message = await bluetooth_pair(body.address)
    return {"ok": ok, "message": message}


@router.post("/bluetooth/remove")
async def post_bluetooth_remove(body: BluetoothAddressRequest) -> dict:
    ok, message = await bluetooth_remove(body.address)
    return {"ok": ok, "message": message}
