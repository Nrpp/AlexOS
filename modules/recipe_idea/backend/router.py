from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

_API_URL = "https://www.themealdb.com/api/json/v1/1/random.php"


@router.get("/recipe")
async def get_recipe() -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(_API_URL)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach TheMealDB.") from error

    meals = data.get("meals") or []
    if not meals:
        raise HTTPException(status_code=503, detail="TheMealDB returned no recipe.")
    meal = meals[0]
    return {
        "name": meal.get("strMeal", ""),
        "category": meal.get("strCategory", ""),
        "area": meal.get("strArea", ""),
        "instructions": meal.get("strInstructions", ""),
        "thumbnailUrl": meal.get("strMealThumb", ""),
    }
