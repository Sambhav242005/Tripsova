import pytest
from httpx import AsyncClient

from app.config import settings
from app.shared.rate_limit import TokenBucket, rate_limiter


class TestTokenBucket:
    def test_allows_up_to_capacity(self):
        bucket = TokenBucket(capacity=3)
        assert bucket.consume() == 0.0
        assert bucket.consume() == 0.0
        assert bucket.consume() == 0.0

    def test_blocks_when_exhausted_with_positive_retry_after(self):
        bucket = TokenBucket(capacity=2)
        bucket.consume()
        bucket.consume()
        retry_after = bucket.consume()
        assert retry_after > 0

    def test_auth_limit_stricter_than_general(self):
        assert settings.RATE_LIMIT_AUTH_PER_MINUTE < settings.RATE_LIMIT_PER_MINUTE


@pytest.fixture
async def rate_limited_client(client: AsyncClient):
    rate_limiter.reset()
    old = (
        settings.RATE_LIMIT_ENABLED,
        settings.RATE_LIMIT_PER_MINUTE,
        settings.RATE_LIMIT_AUTH_PER_MINUTE,
    )
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_PER_MINUTE = 5
    settings.RATE_LIMIT_AUTH_PER_MINUTE = 2
    yield client
    (
        settings.RATE_LIMIT_ENABLED,
        settings.RATE_LIMIT_PER_MINUTE,
        settings.RATE_LIMIT_AUTH_PER_MINUTE,
    ) = old
    rate_limiter.reset()


class TestRateLimitMiddleware:
    async def test_requests_within_limit_succeed(self, rate_limited_client: AsyncClient):
        for _ in range(5):
            response = await rate_limited_client.get("/health")
            assert response.status_code == 200

    async def test_exceeding_general_limit_returns_429_with_retry_after(self, rate_limited_client: AsyncClient):
        for _ in range(5):
            await rate_limited_client.get("/health")
        response = await rate_limited_client.get("/health")
        assert response.status_code == 429
        assert "retry-after" in response.headers
        assert int(response.headers["retry-after"]) >= 1

    async def test_auth_endpoint_has_stricter_limit(self, rate_limited_client: AsyncClient):
        payload = {"email": "nobody@example.com", "password": "wrong-password"}
        for _ in range(2):
            response = await rate_limited_client.post("/api/auth/login", json=payload)
            assert response.status_code != 429
        response = await rate_limited_client.post("/api/auth/login", json=payload)
        assert response.status_code == 429
        assert "retry-after" in response.headers

    async def test_disabled_limiter_passes_everything(self, client: AsyncClient):
        for _ in range(20):
            response = await client.get("/health")
            assert response.status_code == 200
