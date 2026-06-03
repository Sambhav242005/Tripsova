from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.utils import utcnow


async def process_sync(
    db: AsyncSession,
    user_id: str,
    client_last_synced_at: str,
    local_changes: list[dict],
) -> dict:
    server_now = utcnow()
    client_sync_time = None
    if client_last_synced_at:
        try:
            client_sync_time = datetime.fromisoformat(client_last_synced_at)
        except (ValueError, TypeError):
            client_sync_time = None

    accepted = []
    conflicts = []

    for change in local_changes:
        change_type = change.get("type", "unknown")
        change_time = change.get("changed_at")
        change_data = change.get("data", {})

        change_dt = None
        if change_time:
            try:
                change_dt = datetime.fromisoformat(change_time)
            except (ValueError, TypeError):
                change_dt = None

        if client_sync_time and change_dt and change_dt < client_sync_time:
            conflicts.append({
                "entity_id": change_data.get("id"),
                "type": change_type,
                "reason": "Server has newer version than client change",
                "resolution": "server_wins",
            })
        else:
            accepted.append({
                "entity_id": change_data.get("id"),
                "type": change_type,
                "status": "accepted",
            })
            if change_data.get("id"):
                change_data["updated_at"] = server_now.isoformat()

    return {
        "server_synced_at": server_now.isoformat(),
        "accepted_changes": accepted,
        "conflicts": conflicts,
        "total_accepted": len(accepted),
        "total_conflicts": len(conflicts),
    }
