from __future__ import annotations

import html
import random

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

_API_URL = "https://opentdb.com/api.php"


@router.get("/question")
async def get_question() -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(_API_URL, params={"amount": 1})
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Couldn't reach the trivia service.") from error

    results = data.get("results") or []
    if not results:
        raise HTTPException(status_code=503, detail="Trivia service returned no question.")
    result = results[0]

    # Open Trivia DB HTML-encodes its text (e.g. "&quot;", "&#039;").
    question = html.unescape(result.get("question", ""))
    correct = html.unescape(result.get("correct_answer", ""))
    incorrect = [html.unescape(answer) for answer in result.get("incorrect_answers", [])]
    choices = [*incorrect, correct]
    random.shuffle(choices)

    return {
        "category": html.unescape(result.get("category", "")),
        "question": question,
        "choices": choices,
        "correctAnswer": correct,
    }
