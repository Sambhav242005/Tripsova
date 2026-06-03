from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.trippods.models import TripPod, TripPodMember
from app.shared.errors import NotFoundError, BadRequestError, ForbiddenError
from app.shared.pagination import PaginatedResult, PaginatedParams, paginate_query
from app.shared.enums import TripPodMemberStatus


async def create_trip_pod(db: AsyncSession, user_id: str, data: dict) -> TripPod:
    pod = TripPod(
        creator_id=user_id,
        destination_id=data.get("destination_id") or data.get("destinationId"),
        title=data.get("title"),
        start_date=data.get("start_date") or data.get("startDate"),
        end_date=data.get("end_date") or data.get("endDate"),
        budget=data.get("budget"),
        travel_style=data.get("travel_style") or data.get("travelStyle"),
        max_members=data.get("max_members") or data.get("maxMembers", 5),
        gender_preference=data.get("gender_preference") or data.get("genderPreference"),
        verification_required=data.get("verification_required") or data.get("verificationRequired", False),
    )
    db.add(pod)
    await db.flush()
    await db.refresh(pod)

    member = TripPodMember(
        trip_pod_id=pod.id,
        user_id=user_id,
        status=TripPodMemberStatus.APPROVED.value,
    )
    db.add(member)
    await db.flush()
    return pod


async def get_trip_pods(
    db: AsyncSession,
    destination_id: str = None,
    status: str = None,
    page: int = 1,
    per_page: int = 20,
) -> PaginatedResult:
    stmt = select(TripPod)
    if destination_id:
        stmt = stmt.where(TripPod.destination_id == destination_id)
    if status:
        stmt = stmt.where(TripPod.status == status)
    stmt = stmt.order_by(TripPod.created_at.desc())
    params = PaginatedParams(page=page, per_page=per_page)
    return await paginate_query(db, stmt, params)


async def get_trip_pod(db: AsyncSession, pod_id: str) -> TripPod:
    result = await db.execute(select(TripPod).where(TripPod.id == pod_id))
    pod = result.scalar_one_or_none()
    if not pod:
        raise NotFoundError(f"Trip pod with id '{pod_id}' not found")
    return pod


async def request_join(db: AsyncSession, pod_id: str, user_id: str) -> TripPodMember:
    pod = await get_trip_pod(db, pod_id)

    existing_result = await db.execute(
        select(TripPodMember).where(
            TripPodMember.trip_pod_id == pod_id,
            TripPodMember.user_id == user_id,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise BadRequestError("Already requested or joined this pod")

    member_count_result = await db.execute(
        select(func.count()).where(
            TripPodMember.trip_pod_id == pod_id,
            TripPodMember.status == TripPodMemberStatus.APPROVED.value,
        )
    )
    member_count = member_count_result.scalar() or 0
    if member_count >= (pod.max_members or 5):
        raise BadRequestError("Trip pod is full")

    member = TripPodMember(
        trip_pod_id=pod_id,
        user_id=user_id,
        status=TripPodMemberStatus.REQUESTED.value,
    )
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return member


async def approve_member(
    db: AsyncSession,
    pod_id: str,
    member_id: str,
    creator_id: str,
) -> TripPodMember:
    pod = await get_trip_pod(db, pod_id)
    if str(pod.creator_id) != creator_id:
        raise ForbiddenError("Only the pod creator can approve members")

    result = await db.execute(
        select(TripPodMember).where(TripPodMember.id == member_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise NotFoundError("Member request not found")

    member.status = TripPodMemberStatus.APPROVED.value
    await db.flush()
    await db.refresh(member)
    return member


async def reject_member(
    db: AsyncSession,
    pod_id: str,
    member_id: str,
    creator_id: str,
) -> TripPodMember:
    pod = await get_trip_pod(db, pod_id)
    if str(pod.creator_id) != creator_id:
        raise ForbiddenError("Only the pod creator can reject members")

    result = await db.execute(
        select(TripPodMember).where(TripPodMember.id == member_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise NotFoundError("Member request not found")

    member.status = TripPodMemberStatus.REJECTED.value
    await db.flush()
    await db.refresh(member)
    return member
