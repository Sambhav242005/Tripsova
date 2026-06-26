"""Diet-tag normalization shared across food/places filtering.

The frontend catalog uses lowercase chip ids (``pure_veg``); the database stores
uppercase canonical tags (``PURE_VEG``). Some seed tags use alternate names
(e.g. Sattvic data is stored as ``NO_ONION_GARLIC``). This module normalizes both
sides so a requested tag matches regardless of casing or naming.
"""

# Canonical tag -> set of equivalent stored values (all uppercase).
_DIET_ALIASES: dict[str, set[str]] = {
    "JAIN": {"JAIN"},
    "PURE_VEG": {"PURE_VEG", "PUREVEG", "VEG"},
    "VEGAN": {"VEGAN"},
    "VEG_EGG": {"VEG_EGG", "VEGEGG", "EGGETARIAN"},
    "HALAL": {"HALAL"},
    "GLUTEN": {"GLUTEN", "GLUTEN_FREE", "GLUTENFREE"},
    "SATTVIC": {"SATTVIC", "NO_ONION_GARLIC"},
    "KOSHER": {"KOSHER"},
    "BUDDHIST": {"BUDDHIST", "BUDDHIST_VEG"},
}


def _normalize(tag: str) -> str:
    return (tag or "").strip().upper().replace("-", "_").replace(" ", "_")


# Loose labels (from OSM tags, AI inference, or free text) that aren't themselves a stored
# alias but map onto a canonical tag — e.g. OSM's "diet:vegetarian" / "Shudh Shakahari".
_LOOSE_SYNONYMS: dict[str, str] = {
    "VEGETARIAN": "PURE_VEG",
    "SHAKAHARI": "PURE_VEG",
    "SHUDH": "PURE_VEG",
    "SHUDDH": "PURE_VEG",
    "GLUTEN_FREE": "GLUTEN",
}


def to_canonical(label: str) -> str | None:
    """Map any loose diet label to the canonical stored tag, or None if unrecognised.

    Keeps OSM- and AI-derived tags in the same vocabulary the filters match against, so a
    place tagged "vegetarian" actually satisfies the Pure Veg chip instead of silently
    falling through. Unrecognised labels return None so a bad AI guess is dropped.
    """
    key = _normalize(label)
    if not key:
        return None
    if key in _DIET_ALIASES:
        return key
    for canonical, aliases in _DIET_ALIASES.items():
        if key in aliases:
            return canonical
    return _LOOSE_SYNONYMS.get(key)


def _expand(requested: str) -> set[str]:
    """Return all stored values that satisfy a requested tag."""
    key = _normalize(requested)
    if key in _DIET_ALIASES:
        return _DIET_ALIASES[key]
    # Fall back to matching any alias group that contains the normalized value.
    for canonical, aliases in _DIET_ALIASES.items():
        if key in aliases:
            return aliases
    return {key}


def diet_tags_match(place_tags, requested_tags) -> bool:
    """True when a place satisfies every requested diet tag (AND semantics)."""
    have = {_normalize(t) for t in (place_tags or [])}
    if not have:
        return False
    for req in requested_tags:
        if not (_expand(req) & have):
            return False
    return True
