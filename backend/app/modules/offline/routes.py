from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_id
from app.modules.offline.schemas import OfflinePackCreate, OfflinePackResponse, OfflinePackDownloadResponse, SyncRequest, SyncResponse
from app.modules.offline.service import create_offline_pack, get_offline_pack, download_offline_pack, sync_offline_data

router = APIRouter(prefix="/api/offline", tags=["Offline"])

@router.post("/packs", status_code=201, response_model=OfflinePackResponse)
async def create_pack(
    body: OfflinePackCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    pack = await create_offline_pack(db, user_id, body.model_dump())
    return OfflinePackResponse.model_validate(pack)

@router.get("/packs/{pack_id}", response_model=OfflinePackResponse)
async def get_pack(pack_id: str, db: AsyncSession = Depends(get_db)):
    pack = await get_offline_pack(db, pack_id)
    return OfflinePackResponse.model_validate(pack)

@router.get("/packs/{pack_id}/download", response_model=OfflinePackDownloadResponse)
async def download_pack(pack_id: str, db: AsyncSession = Depends(get_db)):
    result = await download_offline_pack(db, pack_id)
    return OfflinePackDownloadResponse.model_validate(result)

@router.post("/sync", response_model=SyncResponse)
async def sync_offline(
    body: SyncRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await sync_offline_data(db, user_id, body.model_dump(exclude_none=True))
    return SyncResponse.model_validate(result)
