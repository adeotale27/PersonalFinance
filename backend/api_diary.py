"""Private daily diary, protected by the same short-lived private-area unlock token."""
from fastapi import APIRouter, Depends
from core import db, serialize, oid, now_utc, normalize_date
from api_losses import require_loss_access

router = APIRouter(tags=["diary"])

@router.get("/diary")
async def list_diary(user: dict = Depends(require_loss_access)):
    docs = await db.diary_entries.find({"deleted_at": {"$exists": False}}).sort([("date", -1), ("created_at", -1)]).to_list(2000)
    return [serialize(d) for d in docs]

@router.post("/diary")
async def create_diary(payload: dict, user: dict = Depends(require_loss_access)):
    payload["date"] = normalize_date(payload.get("date") or now_utc().date().isoformat())
    payload["created_at"] = now_utc(); payload["created_by"] = user.get("email")
    res = await db.diary_entries.insert_one(payload)
    return serialize(await db.diary_entries.find_one({"_id": res.inserted_id}))

@router.put("/diary/{item_id}")
async def update_diary(item_id: str, payload: dict, user: dict = Depends(require_loss_access)):
    payload.pop("id", None); payload.pop("_id", None)
    if "date" in payload: payload["date"] = normalize_date(payload["date"])
    payload["updated_at"] = now_utc()
    await db.diary_entries.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.diary_entries.find_one({"_id": oid(item_id)}))

@router.delete("/diary/{item_id}")
async def delete_diary(item_id: str, user: dict = Depends(require_loss_access)):
    await db.diary_entries.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}
