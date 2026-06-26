import logging
import time
from ipaddress import ip_address
from typing import Optional

import httpx
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.config import settings

logger = logging.getLogger("tripsova.geolock")

# In-memory cache: ip -> (country_code, expires_at)
_geo_cache: dict[str, tuple[str, float]] = {}
_CACHE_TTL = 3600  # 1 hour


def _is_private_ip(ip_str: str) -> bool:
    try:
        return ip_address(ip_str).is_private
    except ValueError:
        return False


class GeoResolver:
    """Resolve IP addresses to country codes via a free external API.

    Defaults to api.country.is (no API key required). Falls back gracefully
    when the upstream is unreachable.
    """

    def __init__(self, url: str = "https://api.country.is/") -> None:
        self._url = url
        self._client = httpx.AsyncClient(timeout=5.0)

    async def resolve(self, ip: str) -> Optional[str]:
        """Return ISO 3166-1 alpha-2 country code for *ip*, or None if unresolvable.

        Private / loopback IPs return ``None`` — the middleware treats these as
        "unknown location" and either allows or blocks per ``GEO_LOCK_STRICT``.
        """
        if _is_private_ip(ip):
            logger.debug("GeoLock: private IP %s — returning None", ip)
            return None

        now = time.time()
        cached = _geo_cache.get(ip)
        if cached and cached[1] > now:
            return cached[0]

        try:
            resp = await self._client.get(self._url, params={"ip": ip})
            resp.raise_for_status()
            data = resp.json()
            country: str = (data or {}).get("country", "")
            if country:
                _geo_cache[ip] = (country, now + _CACHE_TTL)
            return country or None
        except Exception:
            logger.warning("GeoLock: failed to resolve IP %s", ip, exc_info=True)
            return None

    async def close(self) -> None:
        await self._client.aclose()


# ── Paths exempt from geo-locking ─────────────────────────────────────────
GEO_EXEMPT_EXACT = ("/",)
GEO_EXEMPT_PREFIXES = ("/health", "/docs", "/openapi.json", "/redoc")


def _is_exempt(request: Request) -> bool:
    path = request.url.path
    if path in GEO_EXEMPT_EXACT:
        return True
    for prefix in GEO_EXEMPT_PREFIXES:
        if path.startswith(prefix):
            return True
    return False


# ── FastAPI middleware ─────────────────────────────────────────────────────

GEO_RESOLVER: Optional[GeoResolver] = None


async def get_geo_resolver() -> GeoResolver:
    global GEO_RESOLVER
    if GEO_RESOLVER is None:
        GEO_RESOLVER = GeoResolver()
    return GEO_RESOLVER


class GeoLockMiddleware(BaseHTTPMiddleware):
    """Block requests from countries not in the allowed list.

    Reads configuration from ``settings``:
    - ``GEO_LOCK_ENABLED`` — master switch (default: False)
    - ``GEO_LOCK_ALLOWED_COUNTRIES`` — comma-separated ISO codes (default: "IN")
    - ``GEO_LOCK_STRICT`` — if True, block when geo data is unavailable

    The middleware runs after rate-limiting and request-logging so blocked
    requests are still counted and logged.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        if not settings.GEO_LOCK_ENABLED:
            return await call_next(request)

        if _is_exempt(request):
            return await call_next(request)

        # Skip WebSocket upgrades
        if request.headers.get("upgrade", "").lower() == "websocket":
            return await call_next(request)

        resolver = await get_geo_resolver()

        forwarded = request.headers.get("X-Forwarded-For", "")
        client_ip = forwarded.split(",")[0].strip() or request.client.host if request.client else "unknown"

        country = await resolver.resolve(client_ip)

        if country is None:
            if settings.GEO_LOCK_STRICT:
                logger.warning("GeoLock STRICT: blocking request from %s (unresolved IP)", client_ip)
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": "Your location could not be verified. Access is restricted.",
                        "code": "GEO_BLOCKED",
                    },
                )
            logger.debug("GeoLock: unresolved IP %s — allowing through (non-strict)", client_ip)
            return await call_next(request)

        allowed = [c.strip().upper() for c in settings.GEO_LOCK_ALLOWED_COUNTRIES.split(",") if c.strip()]
        if country.upper() not in allowed:
            logger.warning("GeoLock: blocking request from %s (%s)", country, client_ip)
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": f"Access is restricted in your region ({country}).",
                    "code": "GEO_BLOCKED",
                },
            )

        return await call_next(request)


# ── Per-endpoint dependency (alternative to middleware) ───────────────────

async def require_india_only(request: Request) -> None:
    """FastAPI dependency that blocks non-India requests on individual endpoints.

    Usage::

        @router.get("/sensitive")
        async def endpoint(_: None = Depends(require_india_only)):
            ...

    This bypasses the ``GEO_LOCK_ENABLED`` flag — it always checks unless
    ``GEO_LOCK_ALLOWED_COUNTRIES`` contains ``*``.
    """
    allowed = [c.strip().upper() for c in settings.GEO_LOCK_ALLOWED_COUNTRIES.split(",") if c.strip()]
    if "*" in allowed:
        return

    forwarded = request.headers.get("X-Forwarded-For", "")
    client_ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")

    resolver = await get_geo_resolver()
    country = await resolver.resolve(client_ip)

    if country is None:
        if settings.GEO_LOCK_STRICT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"detail": "Could not verify your location.", "code": "GEO_BLOCKED"},
            )
        return

    if country.upper() not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"detail": f"Access is restricted in your region ({country}).", "code": "GEO_BLOCKED"},
        )
