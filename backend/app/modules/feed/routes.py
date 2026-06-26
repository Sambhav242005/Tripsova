from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id
from app.modules.feed.schemas import FeedPostCreate, FeedPostResponse
from app.modules.feed.service import get_feed_posts, create_feed_post, mark_helpful, report_post
from app.shared.pagination import PaginatedResult

router = APIRouter(prefix="/api/feed", tags=["Feed"])

@router.get("", response_model=dict)
async def list_feed(
    destination_id: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await get_feed_posts(db, destination_id=destination_id, search=search, page=page, per_page=per_page)
    return {
        "items": [FeedPostResponse.model_validate(p) for p in result.items],
        "total": result.total,
        "page": result.page,
        "per_page": result.per_page,
        "total_pages": result.total_pages,
    }

@router.post("", status_code=201, response_model=FeedPostResponse)
async def create_feed_post_endpoint(
    body: FeedPostCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    post = await create_feed_post(db, user_id, body.model_dump(exclude_none=True))
    return FeedPostResponse.model_validate(post)

@router.post("/{post_id}/helpful", response_model=dict)
async def helpful_post(
    post_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    # Require auth so helpful/report counts can't be inflated by anonymous spam.
    await mark_helpful(db, post_id)
    return {"status": "ok"}

@router.post("/{post_id}/report", response_model=dict)
async def report_post_endpoint(
    post_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await report_post(db, post_id)
    return {"status": "reported"}
