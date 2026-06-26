"""
Shared AI helper — one OpenAI-compatible JSON call, reused across features.

Mirrors the call the trip planner already makes (``app/modules/trips/ai_provider.py``):
any OpenAI-compatible endpoint (local Ollama by default, or a hosted provider), gated by
``settings.AI_ENABLED`` at the *call site*. Kept provider-agnostic and dependency-light —
never the Anthropic SDK — so a single switch turns AI on/off for the whole app.
"""

import json
import logging
from typing import Any, Optional

from app.config import settings

logger = logging.getLogger("tripsova.ai")


async def ai_json(system: str, user: str, *, temperature: float = 0.2) -> Optional[dict[str, Any]]:
    """Run a JSON-mode chat completion and return the parsed object.

    Returns ``None`` (never raises) on any failure — disabled AI, network error, bad
    JSON — so callers can treat AI as a best-effort enhancement and degrade gracefully.
    """
    if not settings.AI_ENABLED:
        return None

    import httpx

    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
        "stream": False,
        "temperature": temperature,
    }
    headers = {"Content-Type": "application/json"}
    if settings.AI_API_KEY:
        headers["Authorization"] = f"Bearer {settings.AI_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            resp = await client.post(settings.AI_API_URL, json=payload, headers=headers)
        if resp.status_code >= 400:
            logger.warning("AI provider HTTP %s: %s", resp.status_code, resp.text[:300])
            return None
        content = resp.json()["choices"][0]["message"]["content"]
    except Exception:
        logger.exception("AI JSON call failed")
        return None

    if not content:
        return None
    text = content.strip()
    # Some models still fence JSON even in JSON mode.
    if text.startswith("```"):
        text = text.strip("`").strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    try:
        parsed = json.loads(text)
    except (ValueError, TypeError):
        logger.warning("AI returned non-JSON content: %s", text[:300])
        return None
    return parsed if isinstance(parsed, dict) else None
