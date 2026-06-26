import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.trippods.models import TripPod, TripPodMember
from app.modules.users.models import User
from app.shared.errors import NotFoundError, BadRequestError, ForbiddenError
from app.shared.pagination import PaginatedResult, PaginatedParams, paginate_query
from app.shared.enums import TripPodMemberStatus


def _to_uuid(value: str | uuid.UUID) -> uuid.UUID:
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def _initials(name: str | None) -> str:
    parts = [w for w in (name or "").split() if w]
    if not parts:
        return "TR"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


async def _attach_creators(db: AsyncSession, pods: list[TripPod] | tuple[TripPod, ...]) -> None:
    """Attach the host's display name + initials so cards show the real creator
    (e.g. "Aanya Sharma" → "AS"), never a UUID or a guess derived from the title."""
    creator_ids = {pod.creator_id for pod in pods if pod.creator_id}
    if not creator_ids:
        return
    rows = (await db.execute(select(User).where(User.id.in_(creator_ids)))).scalars().all()
    users = {u.id: u for u in rows}
    for pod in pods:
        u = users.get(pod.creator_id)
        pod.creator_name = u.name if u else None
        pod.creator_avatar = _initials(u.name) if u else None


async def _attach_member_counts(db: AsyncSession, pods: list[TripPod] | tuple[TripPod, ...]) -> None:
    pod_ids = [pod.id for pod in pods]
    if not pod_ids:
        return

    result = await db.execute(
        select(TripPodMember.trip_pod_id, func.count())
        .where(
            TripPodMember.trip_pod_id.in_(pod_ids),
            TripPodMember.status == TripPodMemberStatus.APPROVED.value,
        )
        .group_by(TripPodMember.trip_pod_id)
    )
    counts = {pod_id: count for pod_id, count in result.all()}
    for pod in pods:
        pod.member_count = counts.get(pod.id, 0)


async def _attach_member_context(
    db: AsyncSession,
    pods: list[TripPod] | tuple[TripPod, ...],
    user_id: str | None = None,
) -> None:
    pod_ids = [pod.id for pod in pods]
    for pod in pods:
        pod.my_member_status = None
        pod.my_member_id = None
        pod.pending_request_count = 0
        pod.pending_requests = []

    if not pod_ids:
        return

    pending_count_result = await db.execute(
        select(TripPodMember.trip_pod_id, func.count())
        .where(
            TripPodMember.trip_pod_id.in_(pod_ids),
            TripPodMember.status == TripPodMemberStatus.REQUESTED.value,
        )
        .group_by(TripPodMember.trip_pod_id)
    )
    pending_counts = {pod_id: count for pod_id, count in pending_count_result.all()}
    for pod in pods:
        pod.pending_request_count = pending_counts.get(pod.id, 0)

    uid = None
    if user_id:
        try:
            uid = _to_uuid(user_id)
        except ValueError:
            uid = None

    if uid:
        member_rows = (
            await db.execute(
                select(TripPodMember).where(
                    TripPodMember.trip_pod_id.in_(pod_ids),
                    TripPodMember.user_id == uid,
                )
            )
        ).scalars().all()
        by_pod = {member.trip_pod_id: member for member in member_rows}
        for pod in pods:
            member = by_pod.get(pod.id)
            if member:
                pod.my_member_status = member.status
                pod.my_member_id = member.id

        owned_ids = [pod.id for pod in pods if pod.creator_id == uid]
        if owned_ids:
            pending_rows = (
                await db.execute(
                    select(TripPodMember, User)
                    .join(User, User.id == TripPodMember.user_id)
                    .where(
                        TripPodMember.trip_pod_id.in_(owned_ids),
                        TripPodMember.status == TripPodMemberStatus.REQUESTED.value,
                    )
                    .order_by(TripPodMember.created_at.asc())
                )
            ).all()
            pending_by_pod: dict[uuid.UUID, list[dict]] = {pod_id: [] for pod_id in owned_ids}
            for member, requester in pending_rows:
                pending_by_pod.setdefault(member.trip_pod_id, []).append(
                    {
                        "member_id": member.id,
                        "user_id": requester.id,
                        "user_name": requester.name,
                        "user_avatar": _initials(requester.name),
                        "status": member.status,
                        "created_at": member.created_at,
                    }
                )
            for pod in pods:
                if pod.id in pending_by_pod:
                    pod.pending_requests = pending_by_pod[pod.id]


async def create_trip_pod(db: AsyncSession, user_id: str, data: dict) -> TripPod:
    uid = _to_uuid(user_id)
    pod = TripPod(
        creator_id=uid,
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
        user_id=uid,
        status=TripPodMemberStatus.APPROVED.value,
    )
    db.add(member)
    await db.flush()
    pod.member_count = 1
    pod.my_member_status = TripPodMemberStatus.APPROVED.value
    pod.my_member_id = member.id
    pod.pending_request_count = 0
    pod.pending_requests = []
    await _attach_creators(db, [pod])
    return pod


async def get_trip_pods(
    db: AsyncSession,
    destination_id: str = None,
    status: str = None,
    page: int = 1,
    per_page: int = 20,
    user_id: str | None = None,
) -> PaginatedResult:
    stmt = select(TripPod)
    if destination_id:
        stmt = stmt.where(TripPod.destination_id == destination_id)
    if status:
        stmt = stmt.where(TripPod.status == status)
    stmt = stmt.order_by(TripPod.created_at.desc())
    params = PaginatedParams(page=page, per_page=per_page)
    result = await paginate_query(db, stmt, params)
    items = list(result.items)
    await _attach_member_counts(db, items)
    await _attach_creators(db, items)
    await _attach_member_context(db, items, user_id)
    return result


async def get_trip_pod(db: AsyncSession, pod_id: str, user_id: str | None = None) -> TripPod:
    try:
        tid = _to_uuid(pod_id)
    except ValueError:
        raise NotFoundError(f"Trip pod with id '{pod_id}' not found")
    result = await db.execute(select(TripPod).where(TripPod.id == tid))
    pod = result.scalar_one_or_none()
    if not pod:
        raise NotFoundError(f"Trip pod with id '{pod_id}' not found")
    await _attach_member_counts(db, [pod])
    await _attach_creators(db, [pod])
    await _attach_member_context(db, [pod], user_id)
    return pod


async def request_join(db: AsyncSession, pod_id: str, user_id: str) -> TripPodMember:
    pod = await get_trip_pod(db, pod_id)
    uid = _to_uuid(user_id)
    if pod.creator_id == uid:
        raise BadRequestError("You cannot request to join your own pod")

    existing_result = await db.execute(
        select(TripPodMember).where(
            TripPodMember.trip_pod_id == pod.id,
            TripPodMember.user_id == uid,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise BadRequestError("Already requested or joined this pod")

    member_count_result = await db.execute(
        select(func.count()).where(
            TripPodMember.trip_pod_id == pod.id,
            TripPodMember.status == TripPodMemberStatus.APPROVED.value,
        )
    )
    member_count = member_count_result.scalar() or 0
    if member_count >= (pod.max_members or 5):
        raise BadRequestError("Trip pod is full")

    member = TripPodMember(
        trip_pod_id=pod.id,
        user_id=uid,
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
    try:
        mid = _to_uuid(member_id)
    except ValueError:
        raise NotFoundError("Member request not found")

    result = await db.execute(
        select(TripPodMember).where(TripPodMember.id == mid)
    )
    member = result.scalar_one_or_none()
    if not member or member.trip_pod_id != pod.id:
        raise NotFoundError("Member request not found")
    if member.status != TripPodMemberStatus.APPROVED.value:
        member_count_result = await db.execute(
            select(func.count()).where(
                TripPodMember.trip_pod_id == pod.id,
                TripPodMember.status == TripPodMemberStatus.APPROVED.value,
            )
        )
        member_count = member_count_result.scalar() or 0
        if member_count >= (pod.max_members or 5):
            raise BadRequestError("Trip pod is full")

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
    try:
        mid = _to_uuid(member_id)
    except ValueError:
        raise NotFoundError("Member request not found")

    result = await db.execute(
        select(TripPodMember).where(TripPodMember.id == mid)
    )
    member = result.scalar_one_or_none()
    if not member or member.trip_pod_id != pod.id:
        raise NotFoundError("Member request not found")

    member.status = TripPodMemberStatus.REJECTED.value
    await db.flush()
    await db.refresh(member)
    return member
