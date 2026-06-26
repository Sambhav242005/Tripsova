import re
import unicodedata
import uuid
from datetime import datetime, timezone
from typing import Any


def slugify(text: str) -> str:
    # Fold accents to ASCII first ("Café" -> "cafe"). A non-ASCII slug like
    # "pin-pan-café" survives the old [^\w\s-] filter (\w matches Unicode letters)
    # and then 404s on the /food/[slug] SSR round-trip because the percent-encoded
    # path no longer matches the stored slug. Keep slugs strictly [a-z0-9-].
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def safe_divide(a: float | int | None, b: float | int | None) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return a / b


def safe_multiply(a: float | int | None, b: float | int | None) -> float | None:
    if a is None or b is None:
        return None
    return a * b


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def json_serial(obj: Any) -> str:
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)
