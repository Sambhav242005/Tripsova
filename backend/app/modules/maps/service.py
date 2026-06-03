from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.destinations.models import Destination
from app.modules.places.models import Place
from app.shared.errors import NotFoundError


async def get_region_metadata(db: AsyncSession, destination_id: str) -> dict:
    result = await db.execute(select(Destination).where(Destination.id == destination_id))
    destination = result.scalar_one_or_none()
    if not destination:
        raise NotFoundError("Destination not found")

    places_result = await db.execute(
        select(Place).where(Place.destination_id == destination_id)
    )
    places = places_result.scalars().all()

    if places:
        min_lat = min(p.latitude for p in places if p.latitude is not None)
        max_lat = max(p.latitude for p in places if p.latitude is not None)
        min_lng = min(p.longitude for p in places if p.longitude is not None)
        max_lng = max(p.longitude for p in places if p.longitude is not None)
    else:
        min_lat = max_lat = destination.latitude or 0
        min_lng = max_lng = destination.longitude or 0

    center_lat = (min_lat + max_lat) / 2 if min_lat != max_lat else (destination.latitude or min_lat)
    center_lng = (min_lng + max_lng) / 2 if min_lng != max_lng else (destination.longitude or min_lng)

    return {
        "destination_id": str(destination.id),
        "name": destination.name,
        "city": destination.city,
        "state": destination.state,
        "country": destination.country,
        "center": {"lat": center_lat, "lng": center_lng},
        "bounds": {
            "min_lat": min_lat,
            "max_lat": max_lat,
            "min_lng": min_lng,
            "max_lng": max_lng,
        },
        "place_count": len(places),
        "has_offline_data": destination.offline_available,
        "zoom": 12,
    }


async def get_region_pois(db: AsyncSession, destination_id: str) -> list[dict]:
    result = await db.execute(
        select(Place).where(Place.destination_id == destination_id)
    )
    places = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "type": p.type,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "external_rating": p.external_rating,
            "tripova_score": p.tripova_score,
            "tags": p.tags,
        }
        for p in places
        if p.latitude is not None and p.longitude is not None
    ]


async def get_nearby_pois(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius: int = 5000,
    place_type: str = None,
) -> list[dict]:
    point_wkt = f"SRID=4326;POINT({lng} {lat})"
    stmt = select(Place).where(
        func.ST_DWithin(
            Place.geom,
            func.ST_GeogFromText(point_wkt),
            radius,
        )
    )
    if place_type:
        stmt = stmt.where(Place.type == place_type)
    stmt = stmt.order_by(Place.tripova_score.desc().nullslast())
    result = await db.execute(stmt)
    places = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "type": p.type,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "external_rating": p.external_rating,
            "tripova_score": p.tripova_score,
            "phone": p.phone,
            "distance_m": None,
        }
        for p in places
    ]
