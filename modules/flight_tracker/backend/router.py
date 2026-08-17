from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .state import create_flight, delete_flight, list_flights

router = APIRouter()


class CreateFlightRequest(BaseModel):
    flightNumber: str
    departureIso: str
    arrivalIso: str | None = None
    airline: str = ""
    notes: str = ""


@router.get("/flights")
async def get_flights(request: Request) -> list[dict]:
    return await list_flights(request.app.state.storage_manager)


@router.post("/flights", status_code=201)
async def post_flight(body: CreateFlightRequest, request: Request) -> dict:
    return await create_flight(
        request.app.state.storage_manager,
        body.flightNumber,
        body.departureIso,
        body.arrivalIso,
        body.airline,
        body.notes,
    )


@router.delete("/flights/{flight_id}", status_code=204, response_model=None)
async def remove_flight(flight_id: str, request: Request) -> None:
    deleted = await delete_flight(request.app.state.storage_manager, flight_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Flight not found.")
