from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.destinations.models import Destination
from app.modules.places.models import Place
from app.modules.bookings.models import Booking
from app.modules.feed.models import FeedPost


async def get_dashboard_stats(db: AsyncSession) -> dict:
    user_count_result = await db.execute(select(func.count()).select_from(User))
    user_count = user_count_result.scalar() or 0

    dest_count_result = await db.execute(select(func.count()).select_from(Destination))
    dest_count = dest_count_result.scalar() or 0

    place_count_result = await db.execute(select(func.count()).select_from(Place))
    place_count = place_count_result.scalar() or 0

    booking_count_result = await db.execute(select(func.count()).select_from(Booking))
    booking_count = booking_count_result.scalar() or 0

    feed_count_result = await db.execute(select(func.count()).select_from(FeedPost))
    feed_count = feed_count_result.scalar() or 0

    return {
        "users": user_count,
        "destinations": dest_count,
        "places": place_count,
        "bookings": booking_count,
        "feed_posts": feed_count,
    }
