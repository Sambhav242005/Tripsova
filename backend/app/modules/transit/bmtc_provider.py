import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger("tripsova.bmtc")

BASE_URL = "https://bmtcmobileapi.karnataka.gov.in/WebAPI"
TIMEOUT = 15.0


class BMTCApiError(Exception):
    """Raised when the upstream BMTC API returns a non-success."""


class BMTCProvider:
    """Client for the reverse-engineered BMTC (Bengaluru city bus) API.

    All endpoints are POST; the upstream expects JSON bodies with specific headers.
    This provider is **unofficial** — the API is consumed by the BMTC website itself
    and is reverse-engineered from network traffic. Use at your own discretion and
    respect the intended limits of the service.
    """

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=TIMEOUT)

    async def close(self) -> None:
        await self._client.aclose()

    async def _post(self, path: str, body: dict, *, lan: str = "en") -> dict:
        url = f"{BASE_URL}{path}"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*",
            "lan": lan,
        }
        try:
            resp = await self._client.post(url, json=body, headers=headers)
            resp.raise_for_status()
            data: dict = resp.json()
        except httpx.HTTPStatusError as exc:
            logger.error("BMTC API error %s %s: %s", path, exc.response.status_code, exc.response.text[:300])
            raise BMTCApiError(f"BMTC API returned {exc.response.status_code}") from exc
        except Exception as exc:
            logger.error("BMTC API request failed %s: %s", path, exc)
            raise BMTCApiError(str(exc)) from exc

        if not data.get("Issuccess") and data.get("responsecode") != 1:
            logger.warning("BMTC API non-success for %s: %s", path, data.get("Message"))
        return data

    async def search_routes(self, query: str) -> list[dict]:
        """Find bus routes whose number contains the input text (autocomplete)."""
        data = await self._post("/SearchRoute_v2", {"routetext": query})
        return data.get("data") or []

    async def search_stops(self, query: str) -> list[dict]:
        """Search bus stops by name substring."""
        data = await self._post("/FindNearByBusStop_v2", {"stationName": query})
        return data.get("data") or []

    async def get_all_routes(self) -> list[dict]:
        """Return basic info for ~11 000+ operational routes (up/down distinct)."""
        data = await self._post("/GetAllRouteList", {})
        return data.get("data") or []

    async def get_route_details(self, route_id: int, service_type_id: int = 0) -> dict:
        """Return stations + live buses on a route (up & down directions).

        ``route_id`` is the ``routeparentid`` from ``search_routes``.
        """
        data = await self._post("/SearchByRouteDetails_v4", {
            "routeid": route_id,
            "servicetypeid": service_type_id,
        })
        return data

    async def get_vehicle_trip(self, vehicle_id: int) -> dict:
        """Live tracking data for a specific vehicle."""
        data = await self._post("/VehicleTripDetails_v2", {"vehicleId": vehicle_id})
        return data

    async def get_timetable_by_route(
        self,
        route_id: int,
        from_station_id: int,
        to_station_id: int,
        start_time: str,
        end_time: str,
    ) -> list[dict]:
        """Scheduled trip times for a route within a time window."""
        now_iso = datetime.now(timezone.utc).isoformat()
        data = await self._post("/GetTimetableByRouteId_v3", {
            "current_date": now_iso,
            "routeid": route_id,
            "fromStationId": from_station_id,
            "toStationId": to_station_id,
            "starttime": start_time,
            "endtime": end_time,
        })
        return data.get("data") or []

    async def get_timetable_by_station(
        self,
        from_station_id: int,
        to_station_id: int,
        start_time: str,
        end_time: str,
    ) -> list[dict]:
        """Scheduled trips between two stations over a time window."""
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        data = await self._post("/GetTimetableByStation_v4", {
            "fromStationId": from_station_id,
            "toStationId": to_station_id,
            "p_startdate": start_time,
            "p_enddate": end_time,
            "p_isshortesttime": 2,
            "p_routeid": "",
            "p_date": now_str,
        })
        return data.get("data") or []

    async def get_fare(self, route_no: str, route_id: int, direction: str, source_code: str, dest_code: str) -> list[dict]:
        """Fare info for a specific route & stop pair."""
        data = await self._post("/GetMobileFareData_v2", {
            "routeno": route_no,
            "routeid": route_id,
            "route_direction": direction,
            "source_code": source_code,
            "destination_code": dest_code,
        })
        return data.get("data") or []

    async def get_route_points(self, route_id: int) -> list[dict]:
        """Lat/lng for stations on a route, in route order."""
        data = await self._post("/RoutePoints", {"routeid": route_id})
        return data.get("data") or []

    async def get_service_types(self) -> list[dict]:
        """List of service type IDs (AC, Non-AC, etc.)."""
        data = await self._post("/GetAllServiceTypes", {})
        return data.get("data") or []

    async def search_vehicles(self, reg_no: str) -> list[dict]:
        """Find vehicles whose plate contains the input."""
        data = await self._post("/ListVehicles", {
            "vehicleRegNo": reg_no,
            "deviceType": "WEB",
        })
        return data.get("data") or []
