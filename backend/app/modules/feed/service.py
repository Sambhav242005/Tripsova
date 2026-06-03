from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.feed.models import FeedPost
from app.shared.errors import NotFoundError
from app.shared.pagination import PaginatedResult, PaginatedParams, paginate_query
from app.shared.utils import utcnow


async def get_feed_posts(
    db: AsyncSession,
    destination_id: str = None,
    search: str = None,
    page: int = 1,
    per_page: int = 20,
) -> PaginatedResult:
    stmt = select(FeedPost)
    if destination_id:
        stmt = stmt.where(FeedPost.destination_id == destination_id)
    if search:
        stmt = stmt.where(
            func.lower(FeedPost.content).like(f"%{search.lower()}%")
        )
    stmt = stmt.order_by(FeedPost.created_at.desc())
    params = PaginatedParams(page=page, per_page=per_page)
    return await paginate_query(db, stmt, params)


async def create_feed_post(db: AsyncSession, user_id: str, data: dict) -> FeedPost:
    post = FeedPost(
        user_id=user_id,
        destination_id=data.get("destination_id"),
        place_id=data.get("place_id"),
        content=data.get("content", ""),
        media=data.get("media"),
        crowd_level=data.get("crowd_level"),
        weather_note=data.get("weather_note"),
        safety_note=data.get("safety_note"),
        price_note=data.get("price_note"),
        food_note=data.get("food_note"),
    )
    db.add(post)
    await db.flush()
    await db.refresh(post)
    return post


async def mark_helpful(db: AsyncSession, post_id: str) -> None:
    result = await db.execute(select(FeedPost).where(FeedPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise NotFoundError("Feed post not found")
    post.helpful_count = (post.helpful_count or 0) + 1
    await db.flush()


async def report_post(db: AsyncSession, post_id: str) -> None:
    result = await db.execute(select(FeedPost).where(FeedPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise NotFoundError("Feed post not found")
    post.report_count = (post.report_count or 0) + 1
    await db.flush()
