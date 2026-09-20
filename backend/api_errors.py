"""Structured operational error log, separated by surface and route."""
import hashlib
import re
from datetime import datetime, time, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from core import db, raw_db, serialize, now_utc, require_admin
router = APIRouter(tags=["errors"])


def is_platform_admin(user: dict) -> bool:
    return bool(user.get("is_platform_admin"))


async def write_error(scope, kind, message, route="", status_code=None, meta=None):
    def strip_secrets(value) -> str:
        text = str(value or "Unknown error")
        text = re.sub(r"(?i)(bearer\s+)[^\s,;]+", r"\1[redacted]", text)
        text = re.sub(r"(?i)(token|access_token|api[_-]?key)=([^&\s]+)", r"\1=[redacted]", text)
        return text[:1000]

    now = now_utc()
    clean_message, clean_route = strip_secrets(message), strip_secrets(route)[:300]
    clean_kind = str(kind or "Error")[:80]
    fingerprint = hashlib.sha256(f"{scope}|{clean_kind}|{clean_message}|{clean_route}|{status_code or ''}".encode()).hexdigest()
    # One incident remains visible while its occurrence count tells us exactly
    # how often it recurred. A new incident begins after five quiet minutes.
    previous = await db.error_logs.find_one({"fingerprint": fingerprint, "last_seen_at": {"$gte": now - timedelta(minutes=5)}})
    if previous:
        await db.error_logs.update_one({"_id": previous["_id"]}, {"$inc": {"occurrences": 1}, "$set": {"last_seen_at": now}})
        return
    await db.error_logs.insert_one({
        "scope": scope, "kind": clean_kind, "message": clean_message,
        "route": clean_route, "status_code": status_code, "meta": meta or {},
        "fingerprint": fingerprint, "occurrences": 1,
        "timestamp": now, "first_seen_at": now, "last_seen_at": now,
    })
@router.post("/error-logs/client")
async def client_error(payload: dict, user: dict = Depends(require_admin)):
    await write_error("UI", payload.get("kind", "ClientError"), payload.get("message"), payload.get("route"), payload.get("status_code"), {"screen": payload.get("screen")}); return {"status": "logged"}
@router.get("/error-logs")
async def list_errors(scope: str = "ALL", user: dict = Depends(require_admin)):
    query = {} if scope == "ALL" else {"scope": scope}
    collection = raw_db.error_logs if is_platform_admin(user) else db.error_logs
    docs = await collection.find(query).sort([("timestamp", -1)]).to_list(1000)
    if not is_platform_admin(user):
        return [serialize(x) for x in docs]
    workspaces = {str(x["_id"]): x.get("name", "Finance workspace") for x in await raw_db.workspaces.find({}).to_list(500)}
    result = []
    for item in docs:
        row = serialize(item)
        row["occurrences"] = max(int(row.get("occurrences") or 1), 1)
        row["workspace_name"] = workspaces.get(item.get("workspace_id"), "Platform / legacy")
        result.append(row)
    return result

@router.get("/error-logs/unread-count")
async def unread_error_count(user: dict = Depends(require_admin)):
    seen = user.get("error_log_seen_at")
    query = {"timestamp": {"$gt": seen}} if seen else {}
    collection = raw_db.error_logs if is_platform_admin(user) else db.error_logs
    return {"count": await collection.count_documents(query)}

@router.post("/error-logs/mark-seen")
async def mark_errors_seen(user: dict = Depends(require_admin)):
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"error_log_seen_at": now_utc()}})
    return {"status": "ok"}


@router.delete("/error-logs")
async def flush_errors(before: str | None = None, scope: str = "ALL", user: dict = Depends(require_admin)):
    """Clear operational logs for this workspace, optionally only through a date."""
    query = {} if scope == "ALL" else {"scope": scope}
    if before:
        try:
            cutoff = datetime.combine(datetime.fromisoformat(before[:10]).date(), time.max, tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="Use an ISO date for the error-log cutoff")
        query["timestamp"] = {"$lte": cutoff}
    collection = raw_db.error_logs if is_platform_admin(user) else db.error_logs
    result = await collection.delete_many(query)
    return {"deleted": result.deleted_count}
