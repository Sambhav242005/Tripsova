"""
Air hubs for automatic multi-leg routing.

When a journey is long enough to fly, the journey planner routes the traveller through
the nearest major airport at each end ("drive to airport → fly → drive in"). This is a
static list of major Indian airports — enough to make the drive-fly-drive chain realistic
without an external airport dataset. Coordinates are the airport's, not the city centre's.
"""

from math import asin, cos, radians, sin, sqrt
from typing import Optional

# name, latitude, longitude
AIRPORTS: list[dict] = [
    {"name": "Delhi (DEL)",        "latitude": 28.5562, "longitude": 77.1000},
    {"name": "Mumbai (BOM)",       "latitude": 19.0896, "longitude": 72.8656},
    {"name": "Bengaluru (BLR)",    "latitude": 13.1986, "longitude": 77.7066},
    {"name": "Chennai (MAA)",      "latitude": 12.9941, "longitude": 80.1709},
    {"name": "Kolkata (CCU)",      "latitude": 22.6547, "longitude": 88.4467},
    {"name": "Hyderabad (HYD)",    "latitude": 17.2403, "longitude": 78.4294},
    {"name": "Ahmedabad (AMD)",    "latitude": 23.0772, "longitude": 72.6347},
    {"name": "Pune (PNQ)",         "latitude": 18.5793, "longitude": 73.9089},
    {"name": "Goa (GOI)",          "latitude": 15.3808, "longitude": 73.8314},
    {"name": "Kochi (COK)",        "latitude": 10.1520, "longitude": 76.4019},
    {"name": "Jaipur (JAI)",       "latitude": 26.8242, "longitude": 75.8122},
    {"name": "Lucknow (LKO)",      "latitude": 26.7606, "longitude": 80.8893},
    {"name": "Indore (IDR)",       "latitude": 22.7218, "longitude": 75.8011},
    {"name": "Bhopal (BHO)",       "latitude": 23.2875, "longitude": 77.3374},
    {"name": "Nagpur (NAG)",       "latitude": 21.0922, "longitude": 79.0472},
    {"name": "Varanasi (VNS)",     "latitude": 25.4524, "longitude": 82.8593},
    {"name": "Patna (PAT)",        "latitude": 25.5913, "longitude": 85.0879},
    {"name": "Guwahati (GAU)",     "latitude": 26.1061, "longitude": 91.5859},
    {"name": "Thiruvananthapuram (TRV)", "latitude": 8.4821, "longitude": 76.9201},
    {"name": "Srinagar (SXR)",     "latitude": 33.9871, "longitude": 74.7742},
    {"name": "Bagdogra (IXB)",     "latitude": 26.6812, "longitude": 88.3286},
    {"name": "Coimbatore (CJB)",   "latitude": 11.0300, "longitude": 77.0434},
    {"name": "Ranchi (IXR)",       "latitude": 23.3143, "longitude": 85.3217},
    {"name": "Raipur (RPR)",       "latitude": 21.1804, "longitude": 81.7388},
    {"name": "Vadodara (BDQ)",     "latitude": 22.3362, "longitude": 73.2263},
    {"name": "Surat (STV)",        "latitude": 21.1141, "longitude": 72.7417},
    {"name": "Amritsar (ATQ)",     "latitude": 31.7096, "longitude": 74.7973},
    {"name": "Chandigarh (IXC)",   "latitude": 30.6735, "longitude": 76.7885},
    {"name": "Bhubaneswar (BBI)",  "latitude": 20.2444, "longitude": 85.8178},
    {"name": "Visakhapatnam (VTZ)", "latitude": 17.7211, "longitude": 83.2245},
]


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat1, lng1, lat2, lng2 = map(radians, (lat1, lng1, lat2, lng2))
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 6371.0 * 2 * asin(sqrt(a))


def nearest_airport(point: dict) -> Optional[dict]:
    """Closest airport to a {latitude, longitude} point, with `distanceKm` attached."""
    if point is None or point.get("latitude") is None or point.get("longitude") is None:
        return None
    best = min(
        AIRPORTS,
        key=lambda a: _haversine_km(point["latitude"], point["longitude"], a["latitude"], a["longitude"]),
    )
    return {
        **best,
        "distanceKm": round(
            _haversine_km(point["latitude"], point["longitude"], best["latitude"], best["longitude"]), 1
        ),
    }
