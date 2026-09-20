"""Structured operational error log, separated by surface and route."""
from fastapi import APIRouter, Depends
from core import db, serialize, now_utc, require_admin
router = APIRouter(tags=["errors"])
async def write_error(scope, kind, message, route="", status_code=None, meta=None):
    await db.error_logs.insert_one({"scope": scope, "kind": str(kind or "Error")[:80], "message": str(message or "Unknown error")[:1000], "route": str(route or "")[:300], "status_code": status_code, "meta": meta or {}, "timestamp": now_utc()})
@router.post("/error-logs/client")
async def client_error(payload: dict, user: dict = Depends(require_admin)):
    await write_error("UI", payload.get("kind", "ClientError"), payload.get("message"), payload.get("route"), payload.get("status_code"), {"screen": payload.get("screen")}); return {"status": "logged"}
@router.get("/error-logs")
async def list_errors(scope: str = "ALL", user: dict = Depends(require_admin)):
    query = {} if scope == "ALL" else {"scope": scope}; docs = await db.error_logs.find(query).sort([("timestamp", -1)]).to_list(1000); return [serialize(x) for x in docs]

@router.get("/error-logs/unread-count")
async def unread_error_count(user: dict = Depends(require_admin)):
    seen = user.get("error_log_seen_at")
    query = {"timestamp": {"$gt": seen}} if seen else {}
    return {"count": await db.error_logs.count_documents(query)}

@router.post("/error-logs/mark-seen")
async def mark_errors_seen(user: dict = Depends(require_admin)):
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"error_log_seen_at": now_utc()}})
    return {"status": "ok"}
