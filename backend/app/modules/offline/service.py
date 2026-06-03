from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.offline.models import OfflinePack
from app.modules.offline.pack_builder import build_offline_pack
from app.modules.offline.sync import process_sync
from app.shared.errors import NotFoundError


async def create_offline_pack(db: AsyncSession, user_id: str, data: dict) -> OfflinePack:
    destination_id = data.get("destinationId") or data.get("destination_id")
    trip_id = data.get("tripId") or data.get("trip_id")

    pack_data = await build_offline_pack(
        db,
        destination_id=destination_id,
        trip_id=trip_id,
        options=data,
    )

    offline_pack = OfflinePack(
        user_id=user_id,
        destination_id=destination_id,
        trip_id=trip_id,
        title=pack_data.get("destination", {}).get("name", "Offline Pack"),
        pack_json=pack_data,
        data_version=pack_data.get("data_version", 1),
        expires_at=pack_data.get("expires_at"),
        size_bytes=len(str(pack_data).encode("utf-8")),
    )
    db.add(offline_pack)
    await db.flush()
    await db.refresh(offline_pack)
    return offline_pack


async def get_offline_pack(db: AsyncSession, pack_id: str) -> OfflinePack:
    result = await db.execute(select(OfflinePack).where(OfflinePack.id == pack_id))
    pack = result.scalar_one_or_none()
    if not pack:
        raise NotFoundError(f"Offline pack with id '{pack_id}' not found")
    return pack


async def download_offline_pack(db: AsyncSession, pack_id: str) -> dict:
    pack = await get_offline_pack(db, pack_id)
    return pack.pack_json


async def sync_offline_data(db: AsyncSession, user_id: str, data: dict) -> dict:
    return await process_sync(
        db,
        user_id=user_id,
        client_last_synced_at=data.get("client_last_synced_at"),
        local_changes=data.get("local_changes", []),
    )
