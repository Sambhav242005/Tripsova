import logging

from httpx import AsyncClient


class TestRequestLogging:
    async def test_request_emits_structured_log_line(self, client: AsyncClient, caplog):
        with caplog.at_level(logging.INFO, logger="tripsova.access"):
            response = await client.get("/")
        assert response.status_code == 200
        records = [r for r in caplog.records if r.name == "tripsova.access"]
        assert len(records) == 1
        record = records[0]
        assert record.method == "GET"
        assert record.path == "/"
        assert record.status_code == 200
        assert record.duration_ms >= 0

    async def test_health_endpoint_is_excluded(self, client: AsyncClient, caplog):
        with caplog.at_level(logging.INFO, logger="tripsova.access"):
            response = await client.get("/health")
        assert response.status_code == 200
        assert [r for r in caplog.records if r.name == "tripsova.access"] == []

    async def test_error_status_is_logged(self, client: AsyncClient, caplog):
        with caplog.at_level(logging.INFO, logger="tripsova.access"):
            response = await client.get("/api/auth/me")
        assert response.status_code == 401
        records = [r for r in caplog.records if r.name == "tripsova.access"]
        assert len(records) == 1
        assert records[0].status_code == 401
