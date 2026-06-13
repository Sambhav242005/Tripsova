from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.shared.pagination import PaginatedResult
from app.modules.destinations.schemas import DestinationCreate, DestinationUpdate, DestinationResponse
from app.modules.destinations.service import get_destinations, get_destination_by_slug, create_destination, update_destination
from app.shared.cache import TTLCache

router = APIRouter(prefix="/api/destinations", tags=["Destinations"])

# In-process cache for the public destinations list (no Redis). Invalidated on
# create/update below so admin edits show up immediately.
_list_cache = TTLCache(ttl_seconds=300)

@router.get("", response_model=dict)
async def list_destinations(
    search: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    cache_key = ("list", search, page, per_page)
    cached = _list_cache.get(cache_key)
    if cached is not None:
        return cached
    result = await get_destinations(db, search=search, page=page, per_page=per_page)
    payload = {
        "items": [DestinationResponse.model_validate(d) for d in result.items],
        "total": result.total,
        "page": result.page,
        "per_page": result.per_page,
        "total_pages": result.total_pages,
    }
    _list_cache.set(cache_key, payload)
    return payload

@router.get("/{slug}", response_model=DestinationResponse)
async def get_destination(slug: str, db: AsyncSession = Depends(get_db)):
    dest = await get_destination_by_slug(db, slug)
    return DestinationResponse.model_validate(dest)

@router.post("", status_code=201, response_model=DestinationResponse, dependencies=[Depends(require_admin)])
async def create_destination_endpoint(body: DestinationCreate, db: AsyncSession = Depends(get_db)):
    dest = await create_destination(db, body.model_dump())
    _list_cache.clear()
    return DestinationResponse.model_validate(dest)

@router.put("/{destination_id}", response_model=DestinationResponse, dependencies=[Depends(require_admin)])
async def update_destination_endpoint(destination_id: str, body: DestinationUpdate, db: AsyncSession = Depends(get_db)):
    dest = await update_destination(db, destination_id, body.model_dump(exclude_none=True))
    _list_cache.clear()
    return DestinationResponse.model_validate(dest)
