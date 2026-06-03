from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id
from app.modules.trippods.schemas import TripPodCreate, TripPodResponse
from app.modules.trippods.service import create_trip_pod, get_trip_pods, get_trip_pod, request_join, approve_member, reject_member
from app.shared.pagination import PaginatedResult

router = APIRouter(prefix="/api/trippods", tags=["TripPods"])

@router.post("", status_code=201, response_model=TripPodResponse)
async def create_pod(
    body: TripPodCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    pod = await create_trip_pod(db, user_id, body.model_dump(exclude_none=True))
    return TripPodResponse.model_validate(pod)

@router.get("", response_model=dict)
async def list_pods(
    destination_id: str = Query(None),
    status: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await get_trip_pods(db, destination_id=destination_id, status=status, page=page, per_page=per_page)
    return {
        "items": [TripPodResponse.model_validate(p) for p in result.items],
        "total": result.total,
        "page": result.page,
        "per_page": result.per_page,
        "total_pages": result.total_pages,
    }

@router.get("/{pod_id}", response_model=TripPodResponse)
async def get_pod(pod_id: str, db: AsyncSession = Depends(get_db)):
    pod = await get_trip_pod(db, pod_id)
    return TripPodResponse.model_validate(pod)

@router.post("/{pod_id}/join-request", response_model=dict)
async def join_request(
    pod_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    member = await request_join(db, pod_id, user_id)
    return {"status": "requested", "member_id": str(member.id)}

@router.post("/{pod_id}/approve/{member_id}", response_model=dict)
async def approve(
    pod_id: str,
    member_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    member = await approve_member(db, pod_id, member_id, user_id)
    return {"status": "approved", "member_id": str(member.id)}

@router.post("/{pod_id}/reject/{member_id}", response_model=dict)
async def reject(
    pod_id: str,
    member_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    member = await reject_member(db, pod_id, member_id, user_id)
    return {"status": "rejected", "member_id": str(member.id)}
