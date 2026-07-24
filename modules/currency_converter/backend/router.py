from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

_API_URL = "https://api.frankfurter.app/latest"


@router.get("/convert")
async def get_conversion(
    from_currency: str = Query(alias="from", default="USD"),
    to_currency: str = Query(alias="to", default="EUR"),
    amount: float = Query(default=1.0),
) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(_API_URL, params={"from": from_currency, "to": to_currency})
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach the exchange rate service.") from error

    rate = data.get("rates", {}).get(to_currency)
    if rate is None:
        raise HTTPException(status_code=400, detail=f"No rate available for {to_currency}.")
    return {
        "from": from_currency,
        "to": to_currency,
        "rate": rate,
        "amount": amount,
        "converted": round(amount * rate, 4),
        "date": data.get("date"),
    }
