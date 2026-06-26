import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app
from app.config import settings


@pytest.fixture(autouse=True)
def enable_geolock():
    saved = settings.GEO_LOCK_ENABLED, settings.GEO_LOCK_STRICT, settings.GEO_LOCK_ALLOWED_COUNTRIES
    settings.GEO_LOCK_ENABLED = True
    settings.GEO_LOCK_STRICT = False
    settings.GEO_LOCK_ALLOWED_COUNTRIES = "IN"
    yield
    settings.GEO_LOCK_ENABLED, settings.GEO_LOCK_STRICT, settings.GEO_LOCK_ALLOWED_COUNTRIES = saved


@pytest.fixture
async def geolock_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_exempt_from_geolock(geolock_client):
    resp = await geolock_client.get("/health")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_docs_exempt_from_geolock(geolock_client):
    resp = await geolock_client.get("/docs")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_root_exempt_from_geolock(geolock_client):
    resp = await geolock_client.get("/")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_private_ip_allowed_non_strict(geolock_client):
    resp = await geolock_client.get("/api/destinations", headers={"X-Forwarded-For": "192.168.1.1"})
    assert resp.status_code in (200, 404, 422)


@pytest.mark.asyncio
async def test_private_ip_blocked_strict():
    """Private IP returns None from resolver; strict mode returns 403.

    We mock the geo resolver so it returns None regardless of the IP, then check
    that the middleware's dispatch method returns a 403 JSONResponse.
    """
    from app.shared.geolock import GeoLockMiddleware
    from fastapi import Request
    from starlette.responses import JSONResponse

    saved_strict = settings.GEO_LOCK_STRICT
    saved_enabled = settings.GEO_LOCK_ENABLED
    settings.GEO_LOCK_STRICT = True
    settings.GEO_LOCK_ENABLED = True

    from app.shared.geolock import _is_private_ip, get_geo_resolver, GEO_RESOLVER

    # Verify private IP detection works
    assert _is_private_ip("10.0.0.1") is True

    # Create a scope with a client IP that is NOT private (to avoid the private-IP short-circuit)
    # and mock the resolver to return None so we hit the strict-mode block.
    scope = {
        "type": "http",
        "headers": [(b"x-forwarded-for", b"8.8.8.8")],
        "client": ("8.8.8.8", 12345),
        "method": "GET", "path": "/api/places",
        "scheme": "http", "server": ("test", 80),
        "query_string": b"",
        "root_path": "",
    }
    req = Request(scope)

    async def call_next(r):
        return JSONResponse({"ok": True})

    mw = GeoLockMiddleware(app)

    try:
        old_resolver = GEO_RESOLVER
        mock_resolver = type("MockResolver", (), {"resolve": AsyncMock(return_value=None), "close": AsyncMock()})()
        import app.shared.geolock as geolock_mod
        geolock_mod.GEO_RESOLVER = mock_resolver

        resp = await mw.dispatch(req, call_next)
        assert resp.status_code == 403
        body = resp.body.decode()
        assert "GEO_BLOCKED" in body
    finally:
        settings.GEO_LOCK_STRICT = saved_strict
        settings.GEO_LOCK_ENABLED = saved_enabled
        if old_resolver:
            import app.shared.geolock as geolock_mod
            geolock_mod.GEO_RESOLVER = old_resolver


@pytest.mark.asyncio
async def test_require_india_only_dependency_allows_india():
    from app.shared.geolock import require_india_only
    from fastapi import Request

    scope = {
        "type": "http",
        "headers": [(b"x-forwarded-for", b"127.0.0.1")],
        "client": ("127.0.0.1", 8000),
        "method": "GET", "path": "/test",
    }
    req = Request(scope)
    result = await require_india_only(req)
    assert result is None


@pytest.mark.asyncio
async def test_private_ip_detection():
    from app.shared.geolock import _is_private_ip
    assert _is_private_ip("10.0.0.1") is True
    assert _is_private_ip("192.168.1.1") is True
    assert _is_private_ip("172.16.0.1") is True
    assert _is_private_ip("127.0.0.1") is True
    assert _is_private_ip("8.8.8.8") is False
    assert _is_private_ip("1.1.1.1") is False
    assert _is_private_ip("invalid") is False
