"""
AI diet inference — make PureFind useful before the crowd arrives.

PureFind's trust signal is community verification, which only works once a place has
travellers checking in. To work at a *low* user base too, we let an AI classify a place's
likely diet suitability from its name + cuisine (e.g. "Shri Krishna Pure Veg" → vegetarian,
"Al-Baik Grill" → halal). These are **suggestions, not verifications** — they're stored as
ordinary diet hints and only a real traveller check upgrades a place to "diet-trusted".

Gated by ``settings.AI_ENABLED`` (via ``ai_json``); fully best-effort — when AI is off or
fails, ingestion still falls back to OSM-derived tags and the cuisine/type label, so no
place is ever left bare.
"""

import logging

from app.shared.ai import ai_json
from app.shared.diet import to_canonical

logger = logging.getLogger("tripsova.food.diet_ai")

# The diet vocabulary the model may choose from (mapped to canonical tags on return).
_ALLOWED = "jain, vegetarian, vegan, veg_egg, halal, kosher, gluten_free, sattvic, buddhist"

_SYSTEM = (
    "You classify Indian restaurants and cafes by their LIKELY dietary suitability, using "
    "only the name and cuisine given. Be conservative: assign a diet only when the text "
    f"clearly implies it. Allowed diets: {_ALLOWED}. A place may have zero diets — prefer "
    "an empty list over a guess. Never invent diets that aren't supported by the text."
)


async def ai_infer_diet_tags(items: list[dict]) -> list[list[str]]:
    """Classify each ``{"name", "cuisine"}`` → a list of canonical diet tags.

    Returns a list parallel to ``items`` (``[]`` per item when nothing is confident, AI is
    disabled, or the call fails). Never raises.
    """
    out: list[list[str]] = [[] for _ in items]
    if not items:
        return out

    lines = [
        f'{i}. name="{(it.get("name") or "").strip()}" cuisine="{(it.get("cuisine") or "").strip()}"'
        for i, it in enumerate(items)
    ]
    user = (
        'Classify each place below. Reply ONLY with JSON of the shape '
        '{"results": [{"i": 0, "diets": ["vegetarian"]}, ...]} — one entry per place, '
        "diets drawn from the allowed list (empty list if unsure).\n\n" + "\n".join(lines)
    )

    data = await ai_json(_SYSTEM, user, temperature=0.1)
    if not data:
        return out

    for r in data.get("results", []) if isinstance(data.get("results"), list) else []:
        i = r.get("i")
        if not isinstance(i, int) or not (0 <= i < len(items)):
            continue
        canon: list[str] = []
        for d in r.get("diets") or []:
            c = to_canonical(str(d))
            if c and c not in canon:
                canon.append(c)
        out[i] = canon
    return out
