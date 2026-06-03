from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.destinations.models import Destination
from app.modules.feed.models import FeedPost
from app.modules.places.models import Place
from app.modules.trips.models import Trip
from app.shared.utils import utcnow


async def build_offline_pack(
    db: AsyncSession,
    destination_id: str,
    trip_id: str = None,
    options: dict = None,
) -> dict:
    options = options or {}

    dest_result = await db.execute(
        select(Destination).where(Destination.id == destination_id)
    )
    destination = dest_result.scalar_one_or_none()

    places_result = await db.execute(
        select(Place).where(Place.destination_id == destination_id)
    )
    all_places = places_result.scalars().all()

    destination_data = None
    if destination:
        destination_data = {
            "id": str(destination.id),
            "name": destination.name,
            "slug": destination.slug,
            "city": destination.city,
            "state": destination.state,
            "country": destination.country,
            "description": destination.description,
            "best_time_to_visit": destination.best_time_to_visit,
            "latitude": destination.latitude,
            "longitude": destination.longitude,
            "safety_summary": destination.safety_summary,
            "weather_summary": destination.weather_summary,
            "crowd_level": destination.crowd_level,
            "internet_quality": destination.internet_quality,
            "tags": destination.tags,
        }

    places_list = [
        {
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "type": p.type,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "external_rating": p.external_rating,
            "external_review_count": p.external_review_count,
            "diet_tags": p.diet_tags,
            "tripova_score": p.tripova_score,
            "phone": p.phone,
            "address": p.address,
            "price_range": p.price_range,
            "tags": p.tags,
            "opening_hours": p.opening_hours,
        }
        for p in all_places
    ]

    food_spots = [p for p in places_list if p["type"] in ("RESTAURANT", "CAFE")]
    emergency_places = [p for p in places_list if p["type"] == "EMERGENCY"]
    transport_notes = [p for p in places_list if p["type"] == "TRANSPORT"]

    itinerary = None
    if trip_id:
        trip_result = await db.execute(select(Trip).where(Trip.id == trip_id))
        trip = trip_result.scalar_one_or_none()
        if trip:
            itinerary = trip.generated_plan

    feed_result = await db.execute(
        select(FeedPost)
        .where(FeedPost.destination_id == destination_id)
        .order_by(FeedPost.created_at.desc())
        .limit(20)
    )
    feed_posts = feed_result.scalars().all()
    feed_summary = [
        {
            "id": str(f.id),
            "content": f.content[:200] if f.content else "",
            "helpful_count": f.helpful_count,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in feed_posts
    ]

    dest_name = destination.name if destination else "Unknown"
    contacts = _get_emergency_contacts(dest_name)

    now = utcnow()
    bounds = {
        "min_lat": min((p["latitude"] for p in places_list if p["latitude"]), default=0),
        "max_lat": max((p["latitude"] for p in places_list if p["latitude"]), default=0),
        "min_lng": min((p["longitude"] for p in places_list if p["longitude"]), default=0),
        "max_lng": max((p["longitude"] for p in places_list if p["longitude"]), default=0),
    }
    center_lat = (
        (bounds["min_lat"] + bounds["max_lat"]) / 2
        if bounds["min_lat"] != bounds["max_lat"]
        else (destination.latitude if destination else 0)
    )
    center_lng = (
        (bounds["min_lng"] + bounds["max_lng"]) / 2
        if bounds["min_lng"] != bounds["max_lng"]
        else (destination.longitude if destination else 0)
    )

    return {
        "destination": destination_data,
        "places": places_list,
        "itinerary": itinerary,
        "food_spots": food_spots,
        "emergency_places": emergency_places,
        "safety_notes": {
            "summary": destination.safety_summary if destination else None,
            "recent_posts": feed_summary[:5],
        },
        "transport_notes": transport_notes,
        "contacts": contacts,
        "feed_summary": feed_summary,
        "coordinates": {
            "center": {"lat": center_lat, "lng": center_lng},
        },
        "map_metadata": {
            "bounds": bounds,
            "zoom_level": 12,
        },
        "generated_at": now.isoformat(),
        "expires_at": (now + timedelta(days=30)).isoformat(),
        "data_version": 1,
    }


def _get_emergency_contacts(destination_name: str) -> list[dict]:
    return [
        {"name": "Police", "number": "100", "type": "police"},
        {"name": "Ambulance", "number": "102", "type": "medical"},
        {"name": "Fire Brigade", "number": "101", "type": "fire"},
        {"name": "Tourist Helpline", "number": "1800111363", "type": "tourist"},
        {"name": "Women's Helpline", "number": "1091", "type": "helpline"},
    ]
