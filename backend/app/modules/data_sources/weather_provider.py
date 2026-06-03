import httpx

from app.shared.utils import utcnow


class WeatherProvider:
    """
    Free weather provider using Open-Meteo (no API key required).
    """

    OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

    async def get_weather(self, lat: float, lng: float, days: int = 7) -> dict:
        if lat is None or lng is None:
            return {"current": None, "forecast": [], "fetched_at": utcnow().isoformat(), "error": "No coordinates"}

        params = {
            "latitude": lat,
            "longitude": lng,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode",
            "current_weather": True,
            "timezone": "auto",
            "forecast_days": min(days, 16),
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.OPEN_METEO_URL, params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
            except Exception:
                return {"current": None, "forecast": [], "fetched_at": utcnow().isoformat(), "error": "Weather service unavailable"}

        daily = data.get("daily", {})
        dates = daily.get("time", [])
        max_temps = daily.get("temperature_2m_max", [])
        min_temps = daily.get("temperature_2m_min", [])
        precip = daily.get("precipitation_sum", [])

        forecast = [{
            "date": dates[i],
            "temp_max": max_temps[i] if i < len(max_temps) else None,
            "temp_min": min_temps[i] if i < len(min_temps) else None,
            "precipitation_mm": precip[i] if i < len(precip) else None,
        } for i in range(len(dates))]

        current = data.get("current_weather", {})
        return {
            "current": {"temp": current.get("temperature"), "weather_code": current.get("weathercode")},
            "forecast": forecast,
            "fetched_at": utcnow().isoformat(),
        }

    async def get_weather_by_destination_name(self, destination_name: str) -> dict:
        params = {"q": destination_name, "format": "json", "limit": 1}
        async with httpx.AsyncClient() as client:
            try:
                geo_resp = await client.get("https://geocoding-api.open-meteo.com/v1/search", params=params, timeout=10)
                geo_resp.raise_for_status()
                geo_data = geo_resp.json()
            except Exception:
                return {"error": "Could not geocode destination", "forecast": [], "current": None}

        results = geo_data.get("results", [])
        if not results:
            return {"error": f"Destination '{destination_name}' not found", "forecast": [], "current": None}

        return await self.get_weather(results[0]["latitude"], results[0]["longitude"])


weather_provider = WeatherProvider()
