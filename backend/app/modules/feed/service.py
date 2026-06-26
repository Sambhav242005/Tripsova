import uuid

from sqlalchemy import select, func, false
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.feed.models import FeedPost
from app.modules.users.models import User, Destination
from app.shared.errors import NotFoundError
from app.shared.pagination import PaginatedResult, PaginatedParams, paginate_query
from app.shared.utils import utcnow


def _initials(name: str | None) -> str:
    parts = [w for w in (name or "").split() if w]
    if not parts:
        return "TR"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


async def _enrich_posts(db: AsyncSession, posts: list[FeedPost]) -> list[FeedPost]:
    """Attach display fields (author name/initials, destination name) the feed
    cards need, so the UI never has to render a raw UUID. No ORM relationships
    are defined, so we batch-load the referenced users and destinations."""
    user_ids = {p.user_id for p in posts if p.user_id}
    dest_ids = {p.destination_id for p in posts if p.destination_id}
    users: dict = {}
    dests: dict = {}
    if user_ids:
        rows = (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
        users = {u.id: u for u in rows}
    if dest_ids:
        rows = (await db.execute(select(Destination).where(Destination.id.in_(dest_ids)))).scalars().all()
        dests = {d.id: d for d in rows}
    for p in posts:
        u = users.get(p.user_id)
        p.user_name = u.name if u else None
        p.user_avatar = _initials(u.name) if u else None
        d = dests.get(p.destination_id)
        # Surface a human place name; schema exposes it as `destination_name`.
        p.destination_name = d.name if d else None
    return posts


def _to_uuid(value: str, message: str = "Feed post not found") -> uuid.UUID:
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except (ValueError, TypeError):
        raise NotFoundError(message)


def _optional_uuid(value) -> uuid.UUID | None:
    if value is None or value == "":
        return None
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except (ValueError, TypeError):
        return None


async def get_feed_posts(
    db: AsyncSession,
    destination_id: str = None,
    search: str = None,
    page: int = 1,
    per_page: int = 20,
) -> PaginatedResult:
    stmt = select(FeedPost)
    if destination_id:
        try:
            stmt = stmt.where(FeedPost.destination_id == uuid.UUID(str(destination_id)))
        except (ValueError, TypeError):
            stmt = stmt.where(false())
    if search:
        stmt = stmt.where(
            func.lower(FeedPost.content).like(f"%{search.lower()}%")
        )
    stmt = stmt.order_by(FeedPost.created_at.desc())
    params = PaginatedParams(page=page, per_page=per_page)
    result = await paginate_query(db, stmt, params)
    await _enrich_posts(db, result.items)
    return result


async def create_feed_post(db: AsyncSession, user_id: str, data: dict) -> FeedPost:
    post = FeedPost(
        user_id=_to_uuid(user_id, "User not found"),
        destination_id=_optional_uuid(data.get("destination_id")),
        place_id=_optional_uuid(data.get("place_id")),
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
    result = await db.execute(select(FeedPost).where(FeedPost.id == _to_uuid(post_id)))
    post = result.scalar_one_or_none()
    if not post:
        raise NotFoundError("Feed post not found")
    post.helpful_count = (post.helpful_count or 0) + 1
    await db.flush()


async def report_post(db: AsyncSession, post_id: str) -> None:
    result = await db.execute(select(FeedPost).where(FeedPost.id == _to_uuid(post_id)))
    post = result.scalar_one_or_none()
    if not post:
        raise NotFoundError("Feed post not found")
    post.report_count = (post.report_count or 0) + 1
    await db.flush()
