import math
import time

from fastapi.responses import JSONResponse

from app.config import settings

AUTH_RATE_LIMITED_PATHS = ("/api/auth/login", "/api/auth/register")


class TokenBucket:
    """Token bucket refilled continuously at capacity-per-minute."""

    __slots__ = ("capacity", "refill_per_second", "tokens", "updated_at")

    def __init__(self, capacity: int):
        self.capacity = capacity
        self.refill_per_second = capacity / 60.0
        self.tokens = float(capacity)
        self.updated_at = time.monotonic()

    def consume(self) -> float:
        """Take one token. Returns 0.0 if allowed, else seconds until a token is available."""
        now = time.monotonic()
        self.tokens = min(self.capacity, self.tokens + (now - self.updated_at) * self.refill_per_second)
        self.updated_at = now
        if self.tokens >= 1:
            self.tokens -= 1
            return 0.0
        return (1 - self.tokens) / self.refill_per_second


class RateLimiter:
    """In-process per-key token buckets. Buckets are rebuilt if the configured limit changes."""

    def __init__(self):
        self._buckets: dict[tuple[str, str], TokenBucket] = {}

    def check(self, scope_name: str, key: str, per_minute: int) -> float:
        bucket = self._buckets.get((scope_name, key))
        if bucket is None or bucket.capacity != per_minute:
            bucket = TokenBucket(per_minute)
            self._buckets[(scope_name, key)] = bucket
        return bucket.consume()

    def reset(self):
        self._buckets.clear()


rate_limiter = RateLimiter()


class RateLimitMiddleware:
    """ASGI middleware applying per-client-IP rate limits, stricter on auth endpoints.

    Reads settings at request time so the limiter can be toggled/configured in tests.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not settings.RATE_LIMIT_ENABLED:
            await self.app(scope, receive, send)
            return

        client = scope.get("client")
        client_ip = client[0] if client else "unknown"
        path = scope.get("path", "")

        if path in AUTH_RATE_LIMITED_PATHS:
            retry_after = rate_limiter.check("auth", client_ip, settings.RATE_LIMIT_AUTH_PER_MINUTE)
        else:
            retry_after = rate_limiter.check("general", client_ip, settings.RATE_LIMIT_PER_MINUTE)

        if retry_after > 0:
            response = JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"},
                headers={"Retry-After": str(max(1, math.ceil(retry_after)))},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
