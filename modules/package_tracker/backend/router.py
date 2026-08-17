from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import create_package, delete_package, list_packages

router = APIRouter()


class CreatePackageRequest(BaseModel):
    label: str
    carrier: str = ""
    trackingNumber: str = ""
    trackingUrl: str = ""
    estimatedDeliveryDate: str | None = None  # YYYY-MM-DD


@router.get("/packages")
async def get_packages(request: Request) -> list[dict]:
    return await list_packages(request.app.state.storage_manager)


@router.post("/packages", status_code=201)
async def post_package(body: CreatePackageRequest, request: Request) -> dict:
    return await create_package(
        request.app.state.storage_manager,
        body.label,
        body.carrier,
        body.trackingNumber,
        body.trackingUrl,
        body.estimatedDeliveryDate,
    )


@router.delete("/packages/{package_id}", status_code=204, response_model=None)
async def remove_package(package_id: str, request: Request) -> None:
    deleted = await delete_package(request.app.state.storage_manager, package_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Package not found.")
